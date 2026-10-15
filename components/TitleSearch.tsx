"use client";

import { useEffect, useRef, useState } from "react";
import { MEDIA, MEDIUMS, describe, manualKey, type Medium, type TitleRef } from "@/lib/data";
import { SearchIcon } from "./Icons";
import { PosterArt } from "./Media";

// Pick a medium, type a name, choose a result. Anything missing can be added by hand.
export default function TitleSearch({
  onPick,
  initialMedium = "Film",
  autoFocus = false,
}: {
  onPick: (t: TitleRef) => void;
  initialMedium?: Medium;
  autoFocus?: boolean;
}) {
  const [medium, setMedium] = useState<Medium>(initialMedium);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TitleRef[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [manual, setManual] = useState(false);
  const [manualYear, setManualYear] = useState("");
  const [manualBy, setManualBy] = useState("");
  const latest = useRef(0);

  // Search shortly after typing stops
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setState("idle");
      return;
    }
    const ticket = ++latest.current;
    setState("loading");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&medium=${medium}`);
        const data = await res.json();
        if (ticket !== latest.current) return;
        setResults(data.results ?? []);
        setState("done");
      } catch {
        if (ticket === latest.current) setState("error");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, medium]);

  function addManual() {
    const name = q.trim();
    if (!name) return;
    onPick({
      key: manualKey(name, medium),
      name,
      medium,
      year: Number(manualYear) || undefined,
      creator: manualBy.trim() || undefined,
    });
  }

  return (
    <div className="tsearch">
      <div className="chips" role="group" aria-label="Type of media">
        {MEDIUMS.map((m) => (
          <button type="button" key={m} className="chip" aria-pressed={medium === m} onClick={() => setMedium(m)}>
            {MEDIA[m]}
          </button>
        ))}
      </div>
      <label className="searchbox">
        <SearchIcon size={20} />
        <span className="sr-only">Search {MEDIA[medium].toLowerCase()}</span>
        <input
          type="search"
          autoFocus={autoFocus}
          placeholder={`Search ${MEDIA[medium].toLowerCase()} by name`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setManual(false);
          }}
        />
      </label>

      {state === "loading" && <p className="sub tstatus">Searching…</p>}
      {state === "error" && <p className="err tstatus">Search isn&apos;t responding. Check your connection and try again.</p>}
      {state === "done" && !results.length && <p className="sub tstatus">No matches for “{q.trim()}”.</p>}

      {results.length > 0 && (
        <ul className="tresults">
          {results.map((t) => (
            <li key={t.key}>
              <button type="button" onClick={() => onPick(t)}>
                <PosterArt title={t} label={false} className="poster tiny" />
                <span style={{ minWidth: 0 }}>
                  <strong>{t.name}</strong>
                  <span className="sub">{describe(t)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {q.trim().length >= 2 && state !== "loading" && (
        <div className="manual">
          {!manual ? (
            <button type="button" className="linkbtn" style={{ color: "var(--accent)" }} onClick={() => setManual(true)}>
              Can&apos;t find it? Add “{q.trim()}” yourself
            </button>
          ) : (
            <div className="manual-form">
              <p className="sub" style={{ margin: 0 }}>
                Adding <strong style={{ color: "var(--fg)" }}>{q.trim()}</strong> as {MEDIA[medium].toLowerCase()}
              </p>
              <div className="row2">
                <label className="field" htmlFor="manual-year">
                  Year (optional)
                  <input id="manual-year" inputMode="numeric" maxLength={4} value={manualYear} onChange={(e) => setManualYear(e.target.value.replace(/\D/g, ""))} />
                </label>
                <label className="field" htmlFor="manual-by">
                  Made by (optional)
                  <input id="manual-by" value={manualBy} onChange={(e) => setManualBy(e.target.value)} />
                </label>
              </div>
              <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={addManual}>
                Use this title
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
