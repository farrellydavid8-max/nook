"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { BackIcon } from "@/components/Icons";
import { Avatar, Shot } from "@/components/Media";
import { slugify, stars, titleBySlug, type LogPost, type PhotoPost } from "@/lib/data";
import { useStore } from "@/lib/store";

type Tab = "reviews" | "photos";

export default function TitlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { posts, wants, toggleWant, toast } = useStore();
  const [tab, setTab] = useState<Tab>("reviews");
  const t = titleBySlug(slug);
  if (!t) notFound();

  const logs = posts.filter((p): p is LogPost => p.type === "log" && p.title === t.name);
  const rated = logs.filter((p) => p.rating > 0);
  const photos = posts.filter((p): p is PhotoPost => p.type === "photo" && p.title === t.name);
  const avg = rated.length ? (rated.reduce((a, p) => a + p.rating, 0) / rated.length).toFixed(1) : "–";

  // Rating spread in half-star steps, for the little bar chart
  const counts = Array(10).fill(0);
  rated.forEach((p) => counts[Math.round(p.rating * 2) - 1]++);
  const max = Math.max(1, ...counts);
  const wanted = wants.has(t.name);

  return (
    <section aria-label={t.name}>
      <div className="backdrop" style={{ background: `linear-gradient(transparent 40%, var(--bg)), ${t.color}` }}>
        <Link href="/" className="iconbtn" aria-label="Back to feed">
          <BackIcon />
        </Link>
      </div>
      <div className="inset">
        <div className="thead">
          <div className="poster" style={{ background: t.color }}>
            {t.name}
          </div>
          <div style={{ paddingTop: 62, minWidth: 0 }}>
            <h1>{t.name}</h1>
            <div className="sub">
              {t.medium} · {t.year} · {t.by}
            </div>
          </div>
        </div>

        <div className="actions">
          <Link href={`/log?title=${slugify(t.name)}`} className="btn primary">
            Log
          </Link>
          <button
            className="btn"
            aria-pressed={wanted}
            onClick={() => {
              toggleWant(t.name);
              toast(wanted ? "Removed from Want to" : "Added to Want to");
            }}
          >
            {wanted ? "On your list" : "Want to"}
          </button>
          <Link href={`/post?title=${slugify(t.name)}`} className="btn">
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
            <div className="grid3" style={{ marginTop: 16 }}>
              {photos.flatMap((p) => p.shots.map((s, i) => <Shot key={`${p.id}-${i}`} src={s} filter={p.filter} strength={p.strength} />))}
            </div>
          ) : (
            <div className="empty">No photos yet. Post a screenshot or a shot of your copy.</div>
          ))}
      </div>
    </section>
  );
}
