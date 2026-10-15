"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CURRENT_USER, PROGRESS_LABEL, TITLES, findTitle, titleBySlug } from "@/lib/data";
import { useStore } from "@/lib/store";

const STATUSES = ["In progress", "Finished", "Revisit", "Dropped"];

// Accepts full Letterboxd links and their short boxd.it links
const LETTERBOXD = /^(https?:\/\/)?(www\.)?(letterboxd\.com|boxd\.it)\//i;

function LogForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { addPost, toast } = useStore();

  const initial = titleBySlug(params.get("title") ?? "")?.name ?? "Frieren";
  const [title, setTitle] = useState(initial);
  const [status, setStatus] = useState("Finished");
  const [progress, setProgress] = useState(findTitle(initial).progress);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(4);
  const [text, setText] = useState("");
  const [lb, setLb] = useState("");
  const [lbError, setLbError] = useState(false);
  const [spoiler, setSpoiler] = useState(false);

  const t = findTitle(title);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const link = lb.trim();
    if (link && !LETTERBOXD.test(link)) {
      setLbError(true);
      return;
    }
    addPost({
      type: "log",
      user: CURRENT_USER,
      title,
      rating,
      text: text.trim(),
      letterboxd: link ? (link.startsWith("http") ? link : `https://${link}`) : undefined,
      spoiler,
    });
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
        <button type="submit" className="pill">
          Save
        </button>
      </header>

      <label className="field" htmlFor="log-title">
        What did you finish?
        <select
          id="log-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setProgress(findTitle(e.target.value).progress);
          }}
        >
          {TITLES.map((x) => (
            <option key={x.name}>{x.name}</option>
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
          <span style={{ color: "var(--fg)" }}>
            {rating ? `${rating.toFixed(1)} · tap a star again for a half` : "Not rated"}
          </span>
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
        <textarea id="log-review" rows={4} placeholder="What stuck with you?" value={text} onChange={(e) => setText(e.target.value)} />
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
    <Suspense>
      <LogForm />
    </Suspense>
  );
}
