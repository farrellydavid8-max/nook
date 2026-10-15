"use client";

import Link from "next/link";
import { TITLES, slugify } from "@/lib/data";
import { useStore } from "@/lib/store";

// The right-hand column on the desktop feed. Hidden on phones.
export default function SideRail() {
  const { posts, user } = useStore();

  // Titles with the most activity on Nook, then the rest of the catalog
  const activity = new Map<string, number>();
  posts.forEach((p) => activity.set(p.title, (activity.get(p.title) ?? 0) + 1));
  const ranked = [...TITLES].sort((a, b) => (activity.get(b.name) ?? 0) - (activity.get(a.name) ?? 0)).slice(0, 5);

  return (
    <aside className="rail" aria-label="Popular on Nook">
      <div className="rail-card">
        <h2>Popular on Nook</h2>
        <ol className="rail-list">
          {ranked.map((t) => {
            const n = activity.get(t.name) ?? 0;
            return (
              <li key={t.name}>
                <Link href={`/title/${slugify(t.name)}`}>
                  <span className="rail-poster" style={{ background: t.color }} aria-hidden="true" />
                  <span style={{ minWidth: 0 }}>
                    <strong>{t.name}</strong>
                    <span className="sub">
                      {t.medium} · {n ? `${n} ${n === 1 ? "post" : "posts"}` : "No posts yet"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
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
