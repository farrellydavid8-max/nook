"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { BackIcon } from "@/components/Icons";
import { Avatar, Shot } from "@/components/Media";
import { slugify, stars, titleBySlug } from "@/lib/data";
import { useStore } from "@/lib/store";

type Tab = "reviews" | "photos" | "lists";

export default function TitlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { posts, wants, toggleWant, toast } = useStore();
  const [tab, setTab] = useState<Tab>("reviews");
  const t = titleBySlug(slug);
  if (!t) notFound();

  const reviews = posts.filter((p) => p.type === "log" && p.title === t.name);
  const photos = posts.filter((p) => p.type === "photo" && p.title === t.name);
  const avg = reviews.length
    ? (reviews.reduce((a, p) => a + (p.type === "log" ? p.rating : 0), 0) / reviews.length).toFixed(1)
    : "–";

  // Rating spread in half-star steps, for the little bar chart
  const counts = Array(10).fill(0);
  reviews.forEach((p) => p.type === "log" && p.rating > 0 && counts[Math.round(p.rating * 2) - 1]++);
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
          <button className="btn" onClick={() => toast("Added to “Comfort rewatches”")}>
            Add to list
          </button>
        </div>

        <div className="dist">
          <div>
            <div className="label">Friends&apos; average</div>
            <div className="big">{avg}</div>
          </div>
          <div className="bars" aria-hidden="true">
            {counts.map((c, i) => (
              <div key={i} style={{ height: `${Math.max(6, (c / max) * 100)}%`, background: c ? "var(--accent)" : undefined }} />
            ))}
          </div>
        </div>

        <div className="tabs" role="tablist">
          {(["reviews", "photos", "lists"] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {tab === "reviews" &&
          (reviews.length ? (
            <div className="revlist">
              {reviews.map(
                (p) =>
                  p.type === "log" && (
                    <div className="rev" key={p.id}>
                      <Avatar user={p.user} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14 }}>
                          <strong>{p.user}</strong>{" "}
                          <span className="stars" style={{ fontSize: 13 }}>
                            {stars(p.rating)}
                          </span>
                        </div>
                        {p.text && !p.spoiler && <p className="review">{p.text}</p>}
                      </div>
                    </div>
                  )
              )}
            </div>
          ) : (
            <div className="empty">No reviews from friends yet. Be the first to log it.</div>
          ))}

        {tab === "photos" &&
          (photos.length ? (
            <div className="grid3" style={{ marginTop: 16 }}>
              {photos.flatMap((p) => (p.type === "photo" ? p.shots.map((s, i) => <Shot key={`${p.id}-${i}`} src={s} filter={p.filter} />) : []))}
            </div>
          ) : (
            <div className="empty">No photos yet. Post a screenshot or a shot of your copy.</div>
          ))}

        {tab === "lists" && (
          <div className="revlist">
            <div>
              <strong>Comfort rewatches</strong>
              <div className="sub">by sol · 24 titles</div>
            </div>
            <div>
              <strong>Best of {t.year}</strong>
              <div className="sub">by ade · 15 titles</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
