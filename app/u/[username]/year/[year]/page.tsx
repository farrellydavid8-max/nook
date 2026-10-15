"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Poster } from "@/components/Media";
import * as api from "@/lib/api";
import { MEDIA, MEDIUMS, profileHref, type LogPost, type PhotoPost, type Profile } from "@/lib/data";
import { useStore } from "@/lib/store";
import { usePosts } from "@/lib/usePosts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function YearInReview() {
  const params = useParams<{ username: string; year: string }>();
  const username = decodeURIComponent(params.username);
  const year = Number(params.year);
  const { configured, loading, toast } = useStore();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (configured) api.fetchProfileByUsername(username).then(setProfile);
  }, [username, configured]);

  const { posts, loaded } = usePosts(
    profile && !loading ? { userId: profile.id, since: `${year}-01-01T00:00:00Z`, until: `${year + 1}-01-01T00:00:00Z`, limit: 2000 } : null
  );

  if (profile === undefined || (profile && !loaded)) return <div className="empty">Adding up {username}&apos;s year…</div>;
  if (profile === null) return <div className="empty">There&apos;s no one called @{username} on Nook.</div>;

  const logs = posts.filter((p): p is LogPost => p.type === "log" && p.status !== "In progress");
  const photos = posts.filter((p): p is PhotoPost => p.type === "photo");
  const rated = logs.filter((p) => p.rating > 0);
  const avg = rated.length ? rated.reduce((a, p) => a + p.rating, 0) / rated.length : 0;
  const byMedium = MEDIUMS.map((m) => ({ m, n: logs.filter((p) => p.title.medium === m).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const maxMedium = Math.max(1, ...byMedium.map((x) => x.n));
  const byMonth = MONTHS.map((_, i) => logs.filter((p) => new Date(p.loggedOn ? p.loggedOn + "T12:00" : p.createdAt).getMonth() === i).length);
  const maxMonth = Math.max(1, ...byMonth);
  const busiest = byMonth.indexOf(Math.max(...byMonth));
  const top = [...rated].sort((a, b) => b.rating - a.rating).filter((p, i, all) => all.findIndex((x) => x.title.key === p.title.key) === i).slice(0, 4);
  const creators = new Map<string, number>();
  logs.forEach((p) => p.title.creator && creators.set(p.title.creator, (creators.get(p.title.creator) ?? 0) + 1));
  const topCreator = [...creators.entries()].sort((a, b) => b[1] - a[1])[0];
  const rewatches = logs.filter((p) => p.rewatch).length;
  const reviews = logs.filter((p) => p.text).length;

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch {
      toast("Copy the address from your browser's address bar to share");
    }
  }

  return (
    <section className="screen narrow year" aria-label={`${username}'s ${year} in review`}>
      <header className="year-head">
        <Link href={profileHref(username)} className="sub inline-title">
          ← {username}
        </Link>
        <div className="year-nav">
          <Link href={`/u/${username}/year/${year - 1}`} className="btn small" aria-label={`${year - 1}`}>
            ← {year - 1}
          </Link>
          {year < new Date().getFullYear() && (
            <Link href={`/u/${username}/year/${year + 1}`} className="btn small">
              {year + 1} →
            </Link>
          )}
        </div>
      </header>
      <p className="label year-eyebrow">{username}&apos;s year on Nook</p>
      <h1 className="year-big">{year}</h1>

      {logs.length === 0 && photos.length === 0 ? (
        <div className="empty">Nothing logged in {year} yet.</div>
      ) : (
        <>
          <div className="year-stats">
            <div>
              <b>{logs.length}</b>
              <span>things finished</span>
            </div>
            <div>
              <b>{reviews}</b>
              <span>reviews written</span>
            </div>
            <div>
              <b>{photos.reduce((a, p) => a + p.shots.length, 0)}</b>
              <span>photos posted</span>
            </div>
            <div>
              <b>{avg ? avg.toFixed(1) : "–"}</b>
              <span>average rating</span>
            </div>
          </div>

          {byMedium.length > 0 && (
            <div className="year-card">
              <h2>What you got into</h2>
              <div className="hbars">
                {byMedium.map(({ m, n }) => (
                  <div key={m} className="hbar">
                    <span className="hbar-label">{MEDIA[m]}</span>
                    <span className="hbar-track">
                      <span className="hbar-fill" style={{ width: `${(n / maxMedium) * 100}%` }} />
                    </span>
                    <b>{n}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="year-card">
            <h2>Month by month</h2>
            <div className="months" role="img" aria-label={`Busiest month: ${MONTHS[busiest]}`}>
              {byMonth.map((n, i) => (
                <div key={i} className="month">
                  <span className="month-bar" style={{ height: `${Math.max(4, (n / maxMonth) * 100)}%`, opacity: n ? 1 : 0.25 }} title={`${n}`} />
                  <span className="month-label">{MONTHS[i][0]}</span>
                </div>
              ))}
            </div>
            {logs.length > 0 && <p className="sub">Busiest month: {MONTHS[busiest]}, with {byMonth[busiest]} logged.</p>}
          </div>

          {top.length > 0 && (
            <div className="year-card">
              <h2>Highest rated</h2>
              <div className="favs">
                {top.map((p) => (
                  <Poster key={p.title.key} title={p.title} width="auto" />
                ))}
              </div>
            </div>
          )}

          <div className="year-card year-facts">
            {topCreator && topCreator[1] > 1 && (
              <p>
                Most-logged creator: <b>{topCreator[0]}</b> ({topCreator[1]} titles)
              </p>
            )}
            {rewatches > 0 && (
              <p>
                Went back to <b>{rewatches}</b> {rewatches === 1 ? "favorite" : "favorites"} for another round
              </p>
            )}
            <button className="btn primary" onClick={share}>
              Copy link to share
            </button>
          </div>
        </>
      )}
    </section>
  );
}
