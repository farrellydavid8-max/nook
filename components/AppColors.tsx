"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { DEFAULT_ACCENT, DEFAULT_BG, PRESETS, accentReadable, applyTheme, isHex } from "@/lib/theme";

// Pick a preset, or any background and accent color. Changes show instantly and save automatically.
export default function AppColors() {
  const { profile, updateProfile, toast } = useStore();
  const [bg, setBg] = useState(profile?.theme_bg ?? DEFAULT_BG);
  const [accent, setAccent] = useState(profile?.accent ?? DEFAULT_ACCENT);
  const [bgText, setBgText] = useState(bg);
  const [accentText, setAccentText] = useState(accent);
  const saveTimer = useRef<number | undefined>(undefined);

  // Preview right away; save once they stop dragging the color picker
  function choose(nextBg: string, nextAccent: string) {
    setBg(nextBg);
    setAccent(nextAccent);
    setBgText(nextBg);
    setAccentText(nextAccent);
    applyTheme(nextBg, nextAccent);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const problem = await updateProfile({ theme_bg: nextBg.toUpperCase(), accent: nextAccent.toUpperCase() });
      if (problem) toast("Couldn't save your colors. The database update for app colors may still need running.");
    }, 600);
  }

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  return (
    <div className="app-colors">
      <div className="presets" role="group" aria-label="Color presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className="preset"
            aria-pressed={same(p.bg, bg) && same(p.accent, accent)}
            onClick={() => choose(p.bg, p.accent)}
            style={{ background: p.bg }}
          >
            <span className="preset-dot" style={{ background: p.accent }} />
            <span className="preset-name" style={{ color: p.accent }}>
              {p.name}
            </span>
          </button>
        ))}
      </div>

      <div className="row2">
        <label className="field color-field" htmlFor="theme-bg">
          Background
          <span className="color-input">
            <input id="theme-bg" type="color" value={bg} onChange={(e) => choose(e.target.value, accent)} aria-label="Pick a background color" />
            <input
              aria-label="Background color code"
              value={bgText}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                setBgText(v);
                if (isHex(v)) choose(v, accent);
              }}
            />
          </span>
        </label>
        <label className="field color-field" htmlFor="theme-accent">
          Accent
          <span className="color-input">
            <input id="theme-accent" type="color" value={accent} onChange={(e) => choose(bg, e.target.value)} aria-label="Pick an accent color" />
            <input
              aria-label="Accent color code"
              value={accentText}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                setAccentText(v);
                if (isHex(v)) choose(bg, v);
              }}
            />
          </span>
        </label>
      </div>

      {!accentReadable(bg, accent) && (
        <p className="sub" style={{ color: "var(--danger)" }}>
          That accent is hard to see on this background. Buttons and stars may be hard to read.
        </p>
      )}

      <button className="linkbtn small" onClick={() => choose(DEFAULT_BG, DEFAULT_ACCENT)}>
        Reset to Nook&apos;s colors
      </button>
    </div>
  );
}
