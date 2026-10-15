"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { LETTERBOXD, PROGRESS_LABEL, TITLES, findTitle, normalizeUrl, titleBySlug } from "@/lib/data";
import { useStore } from "@/lib/store";

const STATUSES = ["In progress", "Finished", "Revisit", "Dropped"];

function LogForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { addLog, toast } = useStore();

  const initial = titleBySlug(params.get("title") ?? "")?.name ?? TITLES[0].name;
  const [title, setTitle] = useState(initial);
  const [status, setStatus] = useState("Finished");
  const [progress, setProgress] = useState(findTitle(initial).progress);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [lb, setLb] = useState("");
  const [lbError, setLbError] = useState(false);
  const [spoiler, setSpoiler] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = findTitle(title);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const link = lb.trim();
    if (link && !LETTERBOXD.test(link)) {
      setLbError(true);
      return;
    }
    setSaving(true);
    setError(null);
    const problem = await addLog({
      title,
      status,
      progress,
      loggedOn: date,
      rating,
      review: text.trim(),
      letterboxd: link ? normalizeUrl(link) : undefined,
      spoiler,
    });
    setSaving(false);
    if (problem) return setError(problem);
    toast(`Logged ${title}`);
    router.push("/");
  }

  return (
    <form className="screen" onSubmit={save} noValidate aria-label="New log">
      <header className="sheethead">
        <Link href="/" className="linkbtn">
          Cancel
        </Link>
        <h1>New log</h1>
        <button type="submit" className="pill" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      {error && (
        <p className="err" role="alert" style={{ fontSize: 14 }}>
          {error}
        </p>
      )}

      <label className="field" htmlFor="log-title">
        What are you logging?
        <select
          id="log-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setProgress(findTitle(e.target.value).progress);
          }}
        >
          {TITLES.map((x) => (
            <option key={x.name} value={x.name}>
              {x.name} ({x.medium})
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        Status
        <div className="chips wrap" role="group" aria-label="Status">
          {STATUSES.map((s) => (
            <button type="button" key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="row2">
        <label className="field" htmlFor="log-progress">
          {PROGRESS_LABEL[t.medium]}
          <input id="log-progress" value={progress} onChange={(e) => setProgress(e.target.value)} />
        </label>
        <label className="field" htmlFor="log-date">
          Date
          <input id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="field">
        <span>
          Rating{" "}
          <span style={{ color: "var(--fg)" }}>{rating ? `${rating.toFixed(1)} · tap a star again for a half` : "Tap to rate"}</span>
        </span>
        <div className="starpick" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              type="button"
              key={i}
              aria-label={`${i} stars`}
              className={rating >= i ? "on" : rating >= i - 0.5 ? "half" : ""}
              onClick={() => setRating(rating === i ? i - 0.5 : i)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="field" htmlFor="log-review">
        Review
        <textarea id="log-review" rows={4} maxLength={4000} placeholder="What stuck with you?" value={text} onChange={(e) => setText(e.target.value)} />
      </label>

      <label className="field" htmlFor="log-lb">
        Link a Letterboxd review (optional)
        <input
          id="log-lb"
          className="dashed"
          inputMode="url"
          placeholder="https://letterboxd.com/you/film/…"
          value={lb}
          onChange={(e) => {
            setLb(e.target.value);
            setLbError(false);
          }}
          aria-invalid={lbError}
        />
        {lbError && <span className="err">Paste a link that starts with letterboxd.com</span>}
      </label>

      <label className="check" htmlFor="log-spoiler">
        <input id="log-spoiler" type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
        Contains spoilers
      </label>
    </form>
  );
}

export default function LogPage() {
  return (
    <RequireAuth>
      <Suspense>
        <LogForm />
      </Suspense>
    </RequireAuth>
  );
}
