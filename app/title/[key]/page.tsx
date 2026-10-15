"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackIcon } from "@/components/Icons";
import { Avatar, PosterArt, Shot } from "@/components/Media";
import { colorFor, describe, stars, type LogPost, type PhotoPost, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";

type Tab = "reviews" | "photos";

export default function TitlePage() {
  const router = useRouter();
  const key = decodeURIComponent(useParams<{ key: string }>().key);
  const { posts, postsLoaded, wants, toggleWant, toast } = useStore();
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

  const here = posts.filter((p) => p.title.key === key);
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
          </div>
        </div>

        <div className="actions">
          <Link href={`/log?title=${keyParam}`} className="btn primary">
            Log
          </Link>
          <button
            className="btn"
            aria-pressed={wanted}
            onClick={() => {
              toggleWant(t.key);
              toast(wanted ? "Removed from Want to" : "Added to Want to");
            }}
          >
            {wanted ? "On your list" : "Want to"}
          </button>
          <Link href={`/post?title=${keyParam}`} className="btn">
            Post photos
          </Link>
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
          {(["reviews", "photos"] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {k === "reviews" ? `Reviews (${logs.length})` : `Photos (${photos.reduce((a, p) => a + p.shots.length, 0)})`}
            </button>
          ))}
        </div>

        {tab === "reviews" &&
          (logs.length ? (
            <div className="revlist">
              {logs.map((p) => (
                <div className="rev" key={p.id}>
                  <Avatar name={p.user} color={p.avatarColor} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>
                      <strong>{p.user}</strong>{" "}
                      {p.rating > 0 && (
                        <span className="stars" style={{ fontSize: 13 }}>
                          {stars(p.rating)}
                        </span>
                      )}{" "}
                      <span className="meta">· {p.time}</span>
                    </div>
                    {p.spoiler ? <p className="review meta">Review hidden: contains spoilers</p> : p.text && <p className="review">{p.text}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No reviews yet. Be the first to log it.</div>
          ))}

        {tab === "photos" &&
          (photos.length ? (
            <div className="grid3 wall" style={{ marginTop: 16 }}>
              {photos.flatMap((p) => p.shots.map((s, i) => <Shot key={`${p.id}-${i}`} src={s} filter={p.filter} strength={p.strength} />))}
            </div>
          ) : (
            <div className="empty">No photos yet. Post a screenshot or a shot of your copy.</div>
          ))}
      </div>
    </section>
  );
}
