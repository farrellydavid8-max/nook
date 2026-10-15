"use client";

import { useEffect, useState } from "react";
import { describe, type TitleRef } from "@/lib/data";
import { PosterArt } from "./Media";
import TitleSearch from "./TitleSearch";

// Shows the chosen title with a Change button, or the search when nothing is chosen yet.
// `initialKey` (from a link like /log?title=tvmaze-169) is looked up and preselected.
export default function TitlePicker({
  value,
  onChange,
  initialKey,
}: {
  value: TitleRef | null;
  onChange: (t: TitleRef | null) => void;
  initialKey?: string | null;
}) {
  const [looking, setLooking] = useState(Boolean(initialKey));

  useEffect(() => {
    if (!initialKey) return;
    let cancelled = false;
    fetch(`/api/title?key=${encodeURIComponent(initialKey)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.title) onChange(d.title);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLooking(false));
    return () => {
      cancelled = true;
    };
    // Only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  if (looking && !value) return <p className="sub">Loading title…</p>;

  if (value) {
    return (
      <div className="picked">
        <PosterArt title={value} label={false} className="poster small" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ptitle">{value.name}</div>
          <div className="sub">{describe(value)}</div>
        </div>
        <button type="button" className="linkbtn" style={{ color: "var(--accent)" }} onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  return <TitleSearch onPick={onChange} autoFocus />;
}
