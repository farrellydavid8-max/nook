"use client";

import { useEffect, useState } from "react";
import { MEDIA, MEDIUMS, type Medium } from "@/lib/data";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import Modal from "./Modal";

const KEY = "nook_feed_filters";
type Prefs = { shown: Medium[]; selected: Medium[] };

const clean = (p: Partial<Prefs> | null | undefined): Prefs => {
  const shown = (p?.shown ?? MEDIUMS).filter((m): m is Medium => MEDIUMS.includes(m as Medium));
  const list = shown.length ? shown : MEDIUMS;
  return { shown: list, selected: (p?.selected ?? []).filter((m) => list.includes(m as Medium)) as Medium[] };
};

// Filter chips for the feed: tap several to combine them, and Edit to choose which chips show.
// Choices are remembered on this device and, once the database supports it, on your account.
export function useFeedFilters() {
  const { profile } = useStore();
  const [prefs, setPrefs] = useState<Prefs>({ shown: MEDIUMS, selected: [] });

  // Load once you're known: your account's choices first, then this device's
  const profileId = profile?.id;
  useEffect(() => {
    const saved = (profile as { feed_prefs?: Partial<Prefs> } | null)?.feed_prefs;
    if (saved) return setPrefs(clean(saved));
    try {
      const local = localStorage.getItem(KEY);
      if (local) setPrefs(clean(JSON.parse(local)));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function save(next: Prefs) {
    const p = clean(next);
    setPrefs(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {}
    // Saved to the account quietly (this does nothing until update-10.sql adds the column)
    if (profile) {
      getSupabase()
        .from("profiles")
        .update({ feed_prefs: p })
        .eq("id", profile.id)
        .then(
          () => {},
          () => {}
        );
    }
  }

  return { prefs, save };
}

export default function FeedFilters({ prefs, save }: { prefs: Prefs; save: (p: Prefs) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Medium[]>(prefs.shown);
  const selected = new Set(prefs.selected);

  function toggle(m: Medium) {
    const next = new Set(selected);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    // Picking every chip is the same as All
    save({ ...prefs, selected: next.size === prefs.shown.length ? [] : [...next] });
  }

  return (
    <>
      <div className="chips" role="group" aria-label="Filter by type" style={{ paddingTop: 12 }}>
        <button className="chip" aria-pressed={selected.size === 0} onClick={() => save({ ...prefs, selected: [] })}>
          All
        </button>
        {prefs.shown.map((m) => (
          <button key={m} className="chip" aria-pressed={selected.has(m)} onClick={() => toggle(m)}>
            {MEDIA[m]}
          </button>
        ))}
        <button
          className="chip chip-edit"
          aria-label="Choose which filters show"
          onClick={() => {
            setDraft(prefs.shown);
            setEditing(true);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9l-4-4L4 16v4z" />
          </svg>
          Edit
        </button>
      </div>

      {editing && (
        <Modal title="Choose your filters" onClose={() => setEditing(false)}>
          <p className="sub" style={{ marginTop: 0 }}>
            Pick which types show as chips on your feed. In the feed, tap several chips to see them together.
          </p>
          <div className="radio-list">
            {MEDIUMS.map((m) => (
              <label key={m} className="check">
                <input
                  type="checkbox"
                  checked={draft.includes(m)}
                  onChange={(e) => setDraft(e.target.checked ? MEDIUMS.filter((x) => draft.includes(x) || x === m) : draft.filter((x) => x !== m))}
                />
                {MEDIA[m]}
              </label>
            ))}
          </div>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setDraft(MEDIUMS)}>
              Show all
            </button>
            <button
              className="btn primary"
              disabled={!draft.length}
              onClick={() => {
                save({ shown: draft, selected: prefs.selected.filter((m) => draft.includes(m)) });
                setEditing(false);
              }}
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
