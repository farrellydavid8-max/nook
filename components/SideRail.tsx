"use client";

import Link from "next/link";
import { titleHref, type TitleRef } from "@/lib/data";
import { useStore } from "@/lib/store";
import { PosterArt } from "./Media";

// The right-hand column on the desktop feed. Hidden on phones.
export default function SideRail() {
  const { posts, user } = useStore();

  // Titles with the most posts on Nook
  const byKey = new Map<string, { title: TitleRef; n: number }>();
  posts.forEach((p) => {
    const entry = byKey.get(p.title.key) ?? { title: p.title, n: 0 };
    entry.n += 1;
    byKey.set(p.title.key, entry);
  });
  const ranked = [...byKey.values()].sort((a, b) => b.n - a.n).slice(0, 5);

  return (
    <aside className="rail" aria-label="Popular on Nook">
      <div className="rail-card">
        <h2>Popular on Nook</h2>
        {ranked.length ? (
          <ol className="rail-list">
            {ranked.map(({ title, n }) => (
              <li key={title.key}>
                <Link href={titleHref(title)}>
                  <PosterArt title={title} label={false} className="poster rail-poster" />
                  <span style={{ minWidth: 0 }}>
                    <strong>{title.name}</strong>
                    <span className="sub">
                      {title.medium} · {n} {n === 1 ? "post" : "posts"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="sub">Titles people post about will show up here.</p>
        )}
      </div>
      <div className="rail-card">
        <h2>{user ? "Finished something?" : "Join Nook"}</h2>
        <p className="sub" style={{ lineHeight: 1.5 }}>
          {user
            ? "Log it with a rating and a review, or share screenshots and photos of your copy."
            : "Keep a diary of everything you watch, play and read, and see what your friends are into."}
        </p>
        <Link href={user ? "/log" : "/login"} className="btn primary" style={{ width: "100%", marginTop: 12 }}>
          {user ? "Log something" : "Create an account"}
        </Link>
      </div>
    </aside>
  );
}
