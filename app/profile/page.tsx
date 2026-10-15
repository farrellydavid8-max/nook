"use client";

import Link from "next/link";
import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { LinkIcon, PaletteIcon } from "@/components/Icons";
import { Avatar, Poster, Shot } from "@/components/Media";
import { LETTERBOXD, MEDIA, normalizeUrl, stars, type LogPost, type PhotoPost, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";

const BANNERS = ["#3B3226", "#2E4A52", "#4A2E3E", "#2F3A2A", "#1F2433"];
const ACCENTS = ["#E8A33D", "#7FB3D5", "#E08DAE", "#9CC58A", "#C9A7EB"];

type Tab = "Photos" | "Diary";

function ProfileView() {
  const { user, profile, posts, updateProfile, signOut, toast } = useStore();
  const [tab, setTab] = useState<Tab>("Diary");
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [lb, setLb] = useState(profile?.letterboxd_url ?? "");
  const [lbError, setLbError] = useState(false);

  if (!profile || !user) {
    return <div className="empty">Setting up your profile… If this doesn&apos;t go away, try logging out and back in.</div>;
  }

  const logs = posts.filter((p): p is LogPost => p.userId === user.id && p.type === "log");
  const photoPosts = posts.filter((p): p is PhotoPost => p.userId === user.id && p.type === "photo");

  // Stats: how many things you've logged in each medium
  const counts = Object.entries(MEDIA)
    .map(([m, label]) => [label, logs.filter((p) => p.title.medium === m).length] as const)
    .filter(([, n]) => n > 0);

  // Favorites: your highest-rated titles
  const favorites: TitleRef[] = [];
  [...logs]
    .sort((a, b) => b.rating - a.rating)
    .filter((p) => p.rating >= 4)
    .forEach((p) => {
      if (favorites.length < 4 && !favorites.some((f) => f.key === p.title.key)) favorites.push(p.title);
    });

  const statsBlock = profile.show_stats && (
    <div className="stats" key="stats">
      {counts.length ? (
        counts.map(([k, v]) => (
          <div key={k}>
            <b>{v}</b>
            <span>{k}</span>
          </div>
        ))
      ) : (
        <p className="sub" style={{ gridColumn: "1 / -1" }}>
          Your stats appear here as you log things.
        </p>
      )}
    </div>
  );

  const favBlock = (
    <div className="section" key="favs">
      <div className="label" style={{ marginBottom: 8 }}>
        Favorites
      </div>
      {favorites.length ? (
        <div className="favs">
          {favorites.map((t) => (
            <Poster key={t.key} title={t} width="auto" />
          ))}
        </div>
      ) : (
        <p className="sub">Anything you rate 4 stars or more shows up here.</p>
      )}
    </div>
  );

  const tabBlock = (
    <div key="tabs">
      <div className="tabs" role="tablist">
        {(["Diary", "Photos"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Photos" &&
        (photoPosts.length ? (
          <div className="pgrid">
            {photoPosts.flatMap((p) => p.shots.map((s, i) => <Shot key={`${p.id}-${i}`} src={s} filter={p.filter} strength={p.strength} />))}
          </div>
        ) : (
          <div className="empty">
            No photos yet. <Link href="/post">Post your first one.</Link>
          </div>
        ))}
      {tab === "Diary" &&
        (logs.length ? (
          <div className="revlist">
            {logs.map((p) => (
              <div className="rev" key={p.id} style={{ alignItems: "center" }}>
                <Poster title={p.title} width={40} label={false} />
                <div style={{ minWidth: 0 }}>
                  <strong>{p.title.name}</strong>
                  <div className="sub">
                    {p.title.medium} · {p.time}
                    {p.rating > 0 && (
                      <>
                        {" · "}
                        <span style={{ color: "var(--accent)" }}>{stars(p.rating)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            Nothing logged yet. <Link href="/log">Log your first title.</Link>
          </div>
        ))}
    </div>
  );

  const sections = profile.layout === "favorites" ? [statsBlock, favBlock, tabBlock] : [tabBlock, statsBlock, favBlock];

  async function saveDetails() {
    const link = lb.trim();
    if (link && !LETTERBOXD.test(link)) return setLbError(true);
    const problem = await updateProfile({ bio: bio.trim().slice(0, 160), letterboxd_url: link ? normalizeUrl(link) : null });
    if (problem) return toast(problem);
    setEditing(false);
    toast("Profile saved");
  }

  async function set(changes: Parameters<typeof updateProfile>[0]) {
    const problem = await updateProfile(changes);
    if (problem) toast(problem);
  }

  return (
    <section aria-label="Your profile">
      <div className="banner">
        <button className="btn" onClick={() => setEditing(true)}>
          <PaletteIcon size={16} />
          Customize
        </button>
      </div>
      <div className="inset wide">
        <div className="prow">
          <div style={{ border: "4px solid var(--bg)", borderRadius: "50%" }}>
            <Avatar name={profile.username} color={profile.avatar_color} size={80} />
          </div>
          <button className="btn" onClick={signOut}>
            Log out
          </button>
        </div>
        <h1 className="pname">{profile.username}</h1>
        {profile.bio && (
          <p className="review" style={{ marginTop: 4 }}>
            {profile.bio}
          </p>
        )}
        {profile.letterboxd_url && (
          <a className="lb plain" href={profile.letterboxd_url} target="_blank" rel="noopener noreferrer">
            <LinkIcon size={16} />
            Letterboxd
          </a>
        )}
        {sections}
      </div>

      {editing && (
        <>
          <div className="scrim" onClick={() => setEditing(false)} />
          <div className="drawer" role="dialog" aria-label="Customize profile">
            <div className="sheethead">
              <h1>Customize profile</h1>
              <button className="pill" onClick={saveDetails} autoFocus>
                Done
              </button>
            </div>

            <label className="field" htmlFor="pf-bio" style={{ marginTop: 0 }}>
              Bio
              <textarea id="pf-bio" rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you into?" />
            </label>
            <label className="field" htmlFor="pf-lb">
              Letterboxd profile
              <input
                id="pf-lb"
                inputMode="url"
                placeholder="letterboxd.com/yourname"
                value={lb}
                onChange={(e) => {
                  setLb(e.target.value);
                  setLbError(false);
                }}
              />
              {lbError && <span className="err">Paste a link that starts with letterboxd.com</span>}
            </label>

            <div className="label" style={{ marginTop: 16 }}>
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
          </div>
        </>
      )}
    </section>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileView />
    </RequireAuth>
  );
}
