"use client";

import { useState } from "react";
import { LinkIcon, PaletteIcon } from "@/components/Icons";
import { Poster, Shot } from "@/components/Media";
import { CURRENT_USER, MEDIA, findTitle, stars, type FilterName } from "@/lib/data";
import { useStore } from "@/lib/store";

const BANNERS = ["#3B3226", "#2E4A52", "#4A2E3E", "#2F3A2A", "#1F2433"];
const ACCENTS = ["#E8A33D", "#7FB3D5", "#E08DAE", "#9CC58A", "#C9A7EB"];
const FAVORITES = ["Perfect Days", "Elden Ring", "Frieren", "Chainsaw Man"];
const BASE_STATS: Record<string, number> = { Films: 212, Games: 48, Anime: 35, Books: 61 };
const SAMPLE_GRID: [string, FilterName][] = [["s3", "Fade"], ["s0", "Raw"], ["s5", "Grain"], ["s2", "Dusk"], ["s4", "Mono"], ["s1", "Raw"]];

type Tab = "Photos" | "Diary" | "Lists";

export default function ProfilePage() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("Photos");
  const [customizing, setCustomizing] = useState(false);

  const mine = s.posts.filter((p) => p.user === CURRENT_USER);
  const logs = mine.filter((p) => p.type === "log");
  const shots: [string, FilterName][] = [
    ...mine.flatMap((p) => (p.type === "photo" ? p.shots.map((x) => [x, p.filter] as [string, FilterName]) : [])),
    ...SAMPLE_GRID,
  ];

  const statsBlock = s.showStats && (
    <div className="stats" key="stats">
      {Object.entries(BASE_STATS).map(([k, v]) => (
        <div key={k}>
          <b>{v + logs.filter((p) => MEDIA[findTitle(p.title).medium] === k).length}</b>
          <span>{k}</span>
        </div>
      ))}
    </div>
  );

  const favBlock = (
    <div className="section" key="favs">
      <div className="label" style={{ marginBottom: 8 }}>
        Favorites
      </div>
      <div className="favs">
        {FAVORITES.map((t) => (
          <Poster key={t} title={t} width="auto" />
        ))}
      </div>
    </div>
  );

  const tabBlock = (
    <div key="tabs">
      <div className="tabs" role="tablist">
        {(["Photos", "Diary", "Lists"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Photos" && (
        <div className="pgrid">
          {shots.map(([x, f], i) => (
            <Shot key={i} src={x} filter={f} />
          ))}
        </div>
      )}
      {tab === "Diary" && (
        <div className="revlist">
          {logs.map(
            (p) =>
              p.type === "log" && (
                <div className="rev" key={p.id} style={{ alignItems: "center" }}>
                  <Poster title={p.title} width={40} label={false} />
                  <div style={{ minWidth: 0 }}>
                    <strong>{p.title}</strong>
                    <div className="sub">
                      {findTitle(p.title).medium} · {p.time} · <span style={{ color: "var(--accent)" }}>{stars(p.rating)}</span>
                    </div>
                  </div>
                </div>
              )
          )}
        </div>
      )}
      {tab === "Lists" && (
        <div className="revlist">
          <div>
            <strong>Rainy day games</strong>
            <div className="sub">12 titles</div>
          </div>
          <div>
            <strong>Manga that made me cry</strong>
            <div className="sub">9 titles</div>
          </div>
        </div>
      )}
    </div>
  );

  const sections = s.layout === "favorites" ? [statsBlock, favBlock, tabBlock] : [tabBlock, statsBlock, favBlock];

  return (
    <section aria-label="Profile">
      <div className="banner">
        <button className="btn" onClick={() => setCustomizing(true)}>
          <PaletteIcon size={16} />
          Customize
        </button>
      </div>
      <div className="inset">
        <div className="prow">
          <div className="bigav">{CURRENT_USER[0].toUpperCase()}</div>
          <button className="btn" onClick={() => s.toast("Editing name and bio comes next")}>
            Edit profile
          </button>
        </div>
        <h1 className="pname">{CURRENT_USER}</h1>
        <p className="review" style={{ marginTop: 4 }}>
          Slow cinema, cozy games, and too much manga.
        </p>
        <a className="lb plain" href="https://letterboxd.com" target="_blank" rel="noopener noreferrer">
          <LinkIcon size={16} />
          Letterboxd linked
        </a>
        {sections}
      </div>

      {customizing && (
        <>
          <div className="scrim" onClick={() => setCustomizing(false)} />
          <div className="drawer" role="dialog" aria-label="Customize profile">
            <div className="sheethead">
              <h1>Customize profile</h1>
              <button className="pill" onClick={() => setCustomizing(false)} autoFocus>
                Done
              </button>
            </div>
            <div className="label">Banner</div>
            <div className="swatches">
              {BANNERS.map((c) => (
                <button key={c} className="sw" style={{ background: c }} aria-label={`Banner ${c}`} aria-pressed={s.banner === c} onClick={() => s.setBanner(c)} />
              ))}
            </div>
            <div className="label" style={{ marginTop: 16 }}>
              Accent
            </div>
            <div className="swatches">
              {ACCENTS.map((c) => (
                <button key={c} className="sw" style={{ background: c }} aria-label={`Accent ${c}`} aria-pressed={s.accent === c} onClick={() => s.setAccent(c)} />
              ))}
            </div>
            <div className="label" style={{ marginTop: 16 }}>
              Layout
            </div>
            <div className="chips" style={{ paddingTop: 8 }}>
              <button className="chip" aria-pressed={s.layout === "favorites"} onClick={() => s.setLayout("favorites")}>
                Favorites first
              </button>
              <button className="chip" aria-pressed={s.layout === "photos"} onClick={() => s.setLayout("photos")}>
                Photos first
              </button>
            </div>
            <label className="check" htmlFor="show-stats">
              <input id="show-stats" type="checkbox" checked={s.showStats} onChange={(e) => s.setShowStats(e.target.checked)} />
              Show stats
            </label>
          </div>
        </>
      )}
    </section>
  );
}
