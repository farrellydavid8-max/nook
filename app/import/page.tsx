"use client";

import Link from "next/link";
import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import * as api from "@/lib/api";
import { manualKey, profileHref, type TitleRef } from "@/lib/data";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

/* A small CSV reader that handles quotes, commas and line breaks inside reviews */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

type Entry = { name: string; year?: number; uri: string; rating: number; rewatch: boolean; review: string; watched: string };

const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function Importer() {
  const { user, toast, bump, profile } = useStore();
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<"pick" | "working" | "done">("pick");
  const [progress, setProgress] = useState({ label: "", done: 0, total: 0 });
  const [result, setResult] = useState({ logs: 0, skipped: 0, watchlist: 0, unmatched: 0 });
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!user) return;
    setError(null);
    const byName = (n: string) => files.find((f) => f.name.toLowerCase() === n);
    const diaryFile = byName("diary.csv") ?? byName("watched.csv");
    const reviewsFile = byName("reviews.csv");
    const watchFile = byName("watchlist.csv");
    if (!diaryFile && !reviewsFile && !watchFile) {
      return setError("Choose diary.csv, reviews.csv or watchlist.csv from your Letterboxd export.");
    }
    setStage("working");

    try {
      // 1. Read the files
      const diary = diaryFile ? parseCsv(await diaryFile.text()) : [];
      const reviews = reviewsFile ? parseCsv(await reviewsFile.text()) : [];
      const reviewByUri = new Map(reviews.map((r) => [r["Letterboxd URI"], r]));
      const source = diary.length ? diary : reviews;
      const entries: Entry[] = source
        .filter((r) => r.Name)
        .map((r) => {
          const rev = reviewByUri.get(r["Letterboxd URI"]);
          return {
            name: r.Name,
            year: Number(r.Year) || undefined,
            uri: r["Letterboxd URI"] ?? "",
            rating: Number(r.Rating) || 0,
            rewatch: (r.Rewatch ?? "").toLowerCase() === "yes",
            review: stripHtml(rev?.Review ?? r.Review ?? ""),
            watched: r["Watched Date"] || r.Date || "",
          };
        });
      const wantRows = watchFile ? parseCsv(await watchFile.text()).filter((r) => r.Name) : [];

      // 2. Skip anything already imported
      const { data: existing } = await getSupabase().from("posts").select("letterboxd_url").eq("user_id", user.id).not("letterboxd_url", "is", null);
      const seen = new Set((existing ?? []).map((r) => r.letterboxd_url as string));
      const fresh = entries.filter((e) => !e.uri || !seen.has(e.uri));
      const skipped = entries.length - fresh.length;

      // 3. Match each film to the catalog, 25 at a time
      const all = [...fresh.map((e) => ({ name: e.name, year: e.year })), ...wantRows.map((r) => ({ name: r.Name, year: Number(r.Year) || undefined }))];
      const matches: (TitleRef | null)[] = [];
      for (let i = 0; i < all.length; i += 25) {
        setProgress({ label: "Finding your films", done: i, total: all.length });
        const res = await fetch("/api/match-films", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ films: all.slice(i, i + 25) }) });
        const data = await res.json();
        matches.push(...(data.matches ?? all.slice(i, i + 25).map(() => null)));
      }
      const asTitle = (i: number): TitleRef => matches[i] ?? { key: manualKey(all[i].name, "Film"), name: all[i].name, medium: "Film", year: all[i].year };
      const unmatched = matches.filter((m) => !m).length;

      // 4. Save diary entries with their original dates, 100 at a time
      const rows = fresh.map((e, i) => {
        const t = asTitle(i);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(e.watched) ? e.watched : null;
        return {
          user_id: user.id,
          type: "log",
          ...api.titleToRow(t),
          status: "Finished",
          logged_on: date,
          rating: e.rating || null,
          review: e.review || null,
          letterboxd_url: e.uri || null,
          rewatch: e.rewatch,
          created_at: date ? `${date}T12:00:00Z` : new Date().toISOString(),
        };
      });
      for (let i = 0; i < rows.length; i += 100) {
        setProgress({ label: "Saving your diary", done: i, total: rows.length });
        const { error } = await getSupabase().from("posts").insert(rows.slice(i, i + 100));
        if (error) throw error;
      }

      // 5. Watchlist
      for (let i = 0; i < wantRows.length; i++) {
        setProgress({ label: "Saving your watchlist", done: i, total: wantRows.length });
        await api.setWant(user.id, asTitle(fresh.length + i), true).catch(() => {});
      }

      setResult({ logs: rows.length, skipped, watchlist: wantRows.length, unmatched });
      setStage("done");
      bump();
    } catch {
      setStage("pick");
      setError("The import stopped partway. Anything already saved stays saved, and running it again skips those entries.");
      toast("Import stopped");
    }
  }

  return (
    <section className="screen narrow" aria-label="Import from Letterboxd">
      <header className="topbar">
        <h1 className="wordmark page-title" style={{ fontSize: 32 }}>
          Import from Letterboxd
        </h1>
      </header>

      {stage === "pick" && (
        <>
          <ol className="steps">
            <li>
              On Letterboxd, go to{" "}
              <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                Settings → Data
              </a>{" "}
              and click <b>Export your data</b>.
            </li>
            <li>Unzip the file it downloads.</li>
            <li>
              Choose <b>diary.csv</b>, <b>reviews.csv</b> and <b>watchlist.csv</b> below. You can pick all three at once.
            </li>
          </ol>
          <label className="dropzone preview" htmlFor="lb-files" style={{ height: 160 }}>
            <strong>{files.length ? files.map((f) => f.name).join(", ") : "Choose files"}</strong>
            <span className="sub">CSV files from your Letterboxd export</span>
            <input id="lb-files" type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </label>
          {error && (
            <p className="err" role="alert" style={{ fontSize: 14 }}>
              {error}
            </p>
          )}
          <p className="sub" style={{ marginTop: 12, lineHeight: 1.5 }}>
            Entries keep their original dates, so they fill in your diary without flooding your friends&apos; feeds. Anything you&apos;ve already imported is skipped.
          </p>
          <button className="btn primary" style={{ width: "100%", marginTop: 12 }} disabled={!files.length} onClick={run}>
            Import
          </button>
        </>
      )}

      {stage === "working" && (
        <div className="empty">
          <strong style={{ color: "var(--fg)" }}>{progress.label || "Reading your files"}…</strong>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 5}%` }} />
          </div>
          {progress.total > 0 && (
            <span>
              {progress.done} of {progress.total}
            </span>
          )}
          <p>Keep this page open until it finishes.</p>
        </div>
      )}

      {stage === "done" && (
        <div className="empty">
          <strong style={{ color: "var(--fg)", fontSize: 18 }}>Import finished</strong>
          <p>
            Added {result.logs} diary {result.logs === 1 ? "entry" : "entries"}
            {result.watchlist ? ` and ${result.watchlist} watchlist ${result.watchlist === 1 ? "film" : "films"}` : ""}.
            {result.skipped ? ` Skipped ${result.skipped} already imported.` : ""}
            {result.unmatched ? ` ${result.unmatched} couldn't be matched to a poster and were added by name.` : ""}
          </p>
          {profile && (
            <Link href={profileHref(profile.username)} className="btn primary">
              See your diary
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export default function ImportPage() {
  return (
    <RequireAuth>
      <Importer />
    </RequireAuth>
  );
}
