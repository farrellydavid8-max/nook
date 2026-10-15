"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackIcon } from "@/components/Icons";
import AddToList from "@/components/AddToList";
import { PosterArt, Shot } from "@/components/Media";
import PostCard from "@/components/PostCard";
import * as api from "@/lib/api";
import { colorFor, describe, hours, type LibraryGame, type ListItem, type LogPost, type PhotoPost, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";
import { usePosts } from "@/lib/usePosts";

type Tab = "reviews" | "photos" | "lists";

export default function TitlePage() {
  const router = useRouter();
  const key = decodeURIComponent(useParams<{ key: string }>().key);
  const { user, wants, toggleWant, configured, loading, version } = useStore();
  const { posts: here, loaded: postsLoaded, reload } = usePosts(configured && !loading ? { titleKey: key, limit: 300 } : null);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [mine, setMine] = useState<LibraryGame | null>(null);
  useEffect(() => {
    if (user && key.startsWith("steam-")) api.fetchLibraryEntry(user.id, key).then(setMine).catch(() => {});
  }, [user, key]);
  useEffect(() => {
    if (configured) api.fetchListsWithTitle(key).then(setLists).catch(() => {});
  }, [key, configured, version]);
  const [tab, setTab] = useState<Tab>("reviews");
  const [fetched, setFetched] = useState<TitleRef | null>(null);
  const [lookupDone, setLookupDone] = useState(key.startsWith("manual-"));

  useEffect(() => {
    if (key.startsWith("manual-")) return;
    let cancelled = false;
    fetch(`/api/title?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setFetched(d.title ?? null))
      .catch(() => {})
      .finally(() => !cancelled && setLookupDone(true));
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Prefer fresh catalog details; fall back to what was saved with posts
  const t: TitleRef | null = fetched ?? here[0]?.title ?? null;

  if (!t) {
    return (
      <section className="screen narrow">
        <header className="sheethead">
          <button className="iconbtn" aria-label="Back" onClick={() => router.back()}>
            <BackIcon />
          </button>
        </header>
        <div className="empty">{lookupDone && postsLoaded ? "We couldn't find this title." : "Loading…"}</div>
      </section>
    );
  }

  const logs = here.filter((p): p is LogPost => p.type === "log");
  const rated = logs.filter((p) => p.rating > 0);
  const photos = here.filter((p): p is PhotoPost => p.type === "photo");
  const avg = rated.length ? (rated.reduce((a, p) => a + p.rating, 0) / rated.length).toFixed(1) : "–";
  const counts = Array(10).fill(0);
  rated.forEach((p) => counts[Math.round(p.rating * 2) - 1]++);
  const max = Math.max(1, ...counts);
  const wanted = wants.has(t.key);
  const keyParam = encodeURIComponent(t.key);

  return (
    <section aria-label={t.name}>
      <div className="backdrop" style={{ background: `linear-gradient(transparent 30%, var(--bg)), ${colorFor(t.name)}` }}>
        {t.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="backdrop-img" src={t.poster} alt="" aria-hidden="true" />
        )}
        <button className="iconbtn" aria-label="Back" onClick={() => router.back()}>
          <BackIcon />
        </button>
      </div>
      <div className="inset wide">
        <div className="thead">
          <PosterArt title={t} />
          <div className="thead-text">
            <h1>{t.name}</h1>
            <div className="sub">{describe(t)}</div>
            {mine && (
              <div className="sub" style={{ color: "var(--accent)", marginTop: 4 }}>
                You&apos;ve played {hours(mine.minutes)} on Steam
                {mine.achievementsTotal ? ` · ${mine.achievementsDone}/${mine.achievementsTotal} achievements` : ""}
              </div>
            )}
          </div>
        </div>

        <div className="actions">
          <Link href={`/log?title=${keyParam}`} className="btn primary">
            Log
          </Link>
          <button className="btn" aria-pressed={wanted} onClick={() => toggleWant(t)}>
            {wanted ? "✓ Want to" : "Want to"}
          </button>
          <Link href={`/post?title=${keyParam}`} className="btn">
            Post update
          </Link>
          {user && (
            <button className="btn" onClick={() => setAdding(true)}>
              Add to list
            </button>
          )}
        </div>

        <div className="dist">
          <div>
            <div className="label">Average on Nook</div>
            <div className="big">{avg}</div>
          </div>
          <div className="bars" aria-hidden="true">
            {counts.map((c, i) => (
              <div key={i} style={{ height: `${Math.max(6, (c / max) * 100)}%`, background: c ? "var(--accent)" : undefined }} />
            ))}
          </div>
        </div>
        <div className="sub">
          {rated.length} {rated.length === 1 ? "rating" : "ratings"}
        </div>

        <div className="tabs" role="tablist">
          {(["reviews", "photos", "lists"] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {k === "reviews" ? `Reviews (${logs.length})` : k === "photos" ? `Photos (${photos.reduce((a, p) => a + p.shots.length, 0)})` : `Lists (${lists.length})`}
            </button>
          ))}
        </div>

        {tab === "reviews" &&
          (logs.length ? (
            <div className="feed" style={{ paddingTop: 16 }}>
              {logs.map((p) => (
                <PostCard key={p.id} post={p} onChanged={reload} />
              ))}
            </div>
          ) : (
            <div className="empty">No logs yet. Be the first to log it.</div>
          ))}

        {tab === "photos" &&
          (photos.length ? (
            <div className="grid3 wall" style={{ marginTop: 16 }}>
              {photos.flatMap((p) => p.shots.map((s, i) => <Shot key={`${p.id}-${i}`} src={s} filter={p.filter} strength={p.strength} />))}
            </div>
          ) : (
            <div className="empty">No photos yet. Post a screenshot or a shot of your copy.</div>
          ))}

        {tab === "lists" &&
          (lists.length ? (
            <div className="revlist">
              {lists.map((l) => (
                <Link key={l.id} href={`/lists/${l.id}`} className="rev" style={{ textDecoration: "none" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{l.name}</strong>
                    <div className="sub">
                      by {l.owner} · {l.items.length} {l.items.length === 1 ? "title" : "titles"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">Not on anyone&apos;s lists yet.</div>
          ))}
      </div>
      {adding && <AddToList title={t} onClose={() => setAdding(false)} />}
    </section>
  );
}
