"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import LogMedia, { type NewMedia } from "@/components/LogMedia";
import TitlePicker from "@/components/TitlePicker";
import * as api from "@/lib/api";
import { LETTERBOXD, PROGRESS, REWATCH_LABEL, normalizeUrl, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";

const STATUSES = ["In progress", "Finished", "Revisit", "Dropped"];

function LogForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, addLog, toast } = useStore();
  const editId = Number(params.get("edit")) || undefined;

  const [title, setTitle] = useState<TitleRef | null>(null);
  const [status, setStatus] = useState(STATUSES.includes(params.get("status") ?? "") ? params.get("status")! : "Finished");
  const [progress, setProgress] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [lb, setLb] = useState("");
  const [lbError, setLbError] = useState(false);
  const [spoiler, setSpoiler] = useState(false);
  const [rewatch, setRewatch] = useState(false);
  const [keepShots, setKeepShots] = useState<string[]>([]);
  const [removedShots, setRemovedShots] = useState<string[]>([]);
  const [media, setMedia] = useState<NewMedia[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));

  // Editing an existing log: load it and fill in the form
  useEffect(() => {
    if (!editId || !user) return;
    api
      .fetchPosts({ postId: editId, limit: 1 }, user.id)
      .then(([p]) => {
        if (!p || p.type !== "log" || p.userId !== user.id) return setError("You can only edit your own logs.");
        setTitle(p.title);
        setStatus(p.status ?? "Finished");
        setProgress(p.progress ?? "");
        if (p.loggedOn) setDate(p.loggedOn);
        setRating(p.rating);
        setText(p.text);
        setLb(p.letterboxd ?? "");
        setSpoiler(Boolean(p.spoiler));
        setRewatch(Boolean(p.rewatch));
        setKeepShots(p.shots);
      })
      .catch(() => setError("Couldn't load that log."))
      .finally(() => setLoadingEdit(false));
  }, [editId, user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return setError("Choose what you're logging first.");
    const link = title.medium === "Film" ? lb.trim() : "";
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
      rewatch,
      keepShots,
      removedShots,
      files: media.map((m) => m.file),
    }, editId);
    setSaving(false);
    if (problem) return setError(problem);
    toast(editId ? "Log updated" : `Logged ${title.name}`);
    if (editId) router.back();
    else router.push("/");
  }

  return (
    <form className="screen narrow" onSubmit={save} noValidate aria-label={editId ? "Edit log" : "New log"}>
      <header className="sheethead">
        <Link href="/" className="linkbtn">
          Cancel
        </Link>
        <h1>{editId ? "Edit log" : "New log"}</h1>
        <button type="submit" className="pill" disabled={saving || !title}>
          {saving ? (media.length ? "Uploading…" : "Saving…") : "Save"}
        </button>
      </header>

      {error && (
        <p className="err" role="alert" style={{ fontSize: 14 }}>
          {error}
        </p>
      )}

      <div className="field">
        What are you logging?
        {loadingEdit ? <p className="sub">Loading your log…</p> : <TitlePicker value={title} onChange={setTitle} initialKey={editId ? null : params.get("title")} />}
      </div>

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
          {title ? PROGRESS[title.medium].label : "Progress"}
          <input id="log-progress" placeholder={title ? PROGRESS[title.medium].hint : ""} value={progress} onChange={(e) => setProgress(e.target.value)} />
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

      <LogMedia
        existing={keepShots}
        onRemoveExisting={(u) => {
          setKeepShots(keepShots.filter((x) => x !== u));
          setRemovedShots([...removedShots, u]);
        }}
        added={media}
        setAdded={setMedia}
      />

      {title?.medium === "Film" && (
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
      )}

      <label className="check" htmlFor="log-rewatch">
        <input id="log-rewatch" type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} />
        {title ? REWATCH_LABEL[title.medium] : "Rewatch, replay or reread"} (I&apos;ve done this before)
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
