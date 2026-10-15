"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import { LETTERBOXD, USERNAME, normalizeUrl, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { PosterArt } from "./Media";
import Modal from "./Modal";
import SteamConnect from "./SteamConnect";
import TitleSearch from "./TitleSearch";

const BANNERS = ["#3B3226", "#2E4A52", "#4A2E3E", "#2F3A2A", "#1F2433", "#4A3A22"];
const ACCENTS = ["#E8A33D", "#7FB3D5", "#E08DAE", "#9CC58A", "#C9A7EB", "#F0876B"];

export default function CustomizeProfile({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, profile, updateProfile, toast } = useStore();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [lb, setLb] = useState(profile?.letterboxd_url ?? "");
  const [favorites, setFavorites] = useState<TitleRef[]>(profile?.favorites ?? []);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!profile || !user) return null;

  async function save() {
    setError(null);
    const name = username.trim().toLowerCase();
    if (!USERNAME.test(name)) return setError("Usernames are 3–20 characters: lowercase letters, numbers and underscores.");
    const link = lb.trim();
    if (link && !LETTERBOXD.test(link)) return setError("The Letterboxd link should start with letterboxd.com.");
    setSaving(true);
    if (name !== profile!.username && (await api.isUsernameTaken(name, user!.id))) {
      setSaving(false);
      return setError(`@${name} is taken. Try another username.`);
    }
    const problem = await updateProfile({
      username: name,
      bio: bio.trim().slice(0, 160),
      letterboxd_url: link ? normalizeUrl(link) : null,
      favorites,
    });
    setSaving(false);
    if (problem) return setError(problem);
    toast("Profile saved");
    onClose();
    if (name !== profile!.username) router.replace(`/u/${name}`);
  }

  // Colors and layout save right away so you can see them change
  async function set(changes: Parameters<typeof updateProfile>[0]) {
    const problem = await updateProfile(changes);
    if (problem) toast(problem);
  }

  if (picking) {
    return (
      <Modal title="Add a favorite" onClose={() => setPicking(false)} wide>
        <TitleSearch
          autoFocus
          onPick={(t) => {
            if (!favorites.some((f) => f.key === t.key)) setFavorites([...favorites, t].slice(0, 4));
            setPicking(false);
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Customize profile" onClose={onClose} wide>
      <label className="field" htmlFor="pf-username" style={{ marginTop: 0 }}>
        Username
        <input id="pf-username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
      </label>
      {profile.username.startsWith("user_") && <p className="sub">Pick a username so friends can find you.</p>}
      <label className="field" htmlFor="pf-bio">
        Bio
        <textarea id="pf-bio" rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you into?" />
      </label>
      <label className="field" htmlFor="pf-lb">
        Letterboxd profile
        <input id="pf-lb" inputMode="url" placeholder="letterboxd.com/yourname" value={lb} onChange={(e) => setLb(e.target.value)} />
      </label>

      <div className="label" style={{ marginTop: 18 }}>
        Top 4 favorites, any medium
      </div>
      <div className="fav-slots">
        {[0, 1, 2, 3].map((i) => {
          const f = favorites[i];
          return f ? (
            <div key={f.key} className="fav-slot">
              <PosterArt title={f} />
              <button className="fav-remove" aria-label={`Remove ${f.name}`} onClick={() => setFavorites(favorites.filter((x) => x.key !== f.key))}>
                ×
              </button>
            </div>
          ) : (
            <button key={i} className="fav-slot empty-slot" onClick={() => setPicking(true)} aria-label="Add a favorite">
              +
            </button>
          );
        })}
      </div>

      <div className="label" style={{ marginTop: 18 }}>
        Banner
      </div>
      <div className="swatches">
        {BANNERS.map((c) => (
          <button key={c} className="sw" style={{ background: c }} aria-label={`Banner ${c}`} aria-pressed={profile.banner === c} onClick={() => set({ banner: c })} />
        ))}
      </div>
      <div className="label" style={{ marginTop: 16 }}>
        Accent
      </div>
      <div className="swatches">
        {ACCENTS.map((c) => (
          <button key={c} className="sw" style={{ background: c }} aria-label={`Accent ${c}`} aria-pressed={profile.accent === c} onClick={() => set({ accent: c })} />
        ))}
      </div>
      <div className="label" style={{ marginTop: 16 }}>
        Layout
      </div>
      <div className="chips" style={{ paddingTop: 8 }}>
        <button className="chip" aria-pressed={profile.layout === "favorites"} onClick={() => set({ layout: "favorites" })}>
          Favorites first
        </button>
        <button className="chip" aria-pressed={profile.layout === "photos"} onClick={() => set({ layout: "photos" })}>
          Diary first
        </button>
      </div>
      <label className="check" htmlFor="show-stats">
        <input id="show-stats" type="checkbox" checked={profile.show_stats} onChange={(e) => set({ show_stats: e.target.checked })} />
        Show stats
      </label>

      <div className="label" style={{ marginTop: 18 }}>
        Connected accounts
      </div>
      <SteamConnect />

      {error && (
        <p className="err" role="alert" style={{ fontSize: 14 }}>
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
