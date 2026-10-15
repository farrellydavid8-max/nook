"use client";

import Link from "next/link";
import { useState } from "react";
import PostCard from "@/components/PostCard";
import SetupNotice from "@/components/SetupNotice";
import { SearchIcon } from "@/components/Icons";
import { findTitle, MEDIA, type Medium } from "@/lib/data";
import { useStore } from "@/lib/store";

export default function FeedPage() {
  const { configured, posts, postsLoaded, user, loading } = useStore();
  const [filter, setFilter] = useState<"All" | Medium>("All");
  const list = posts.filter((p) => filter === "All" || findTitle(p.title).medium === filter);

  return (
    <section className="screen" aria-label="Feed">
      <header className="topbar">
        <h1 className="wordmark">
          Nook<span>.</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Link href="/title/dune-part-two" className="iconbtn" aria-label="Explore titles">
            <SearchIcon />
          </Link>
          {!loading && !user && configured && (
            <Link href="/login" className="btn primary" style={{ minHeight: 38 }}>
              Log in
            </Link>
          )}
        </div>
      </header>

      {!configured ? (
        <SetupNotice />
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter by medium">
            {(["All", ...Object.keys(MEDIA)] as ("All" | Medium)[]).map((k) => (
              <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {k === "All" ? "All" : MEDIA[k]}
              </button>
            ))}
          </div>

          <div className="feed">
            {!postsLoaded ? (
              <div className="empty">Loading the feed…</div>
            ) : list.length ? (
              list.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <div className="empty">
                {filter === "All" ? "Nothing here yet." : `No ${MEDIA[filter].toLowerCase()} logged yet.`}
                <br />
                {user ? "Log something with the + button to start the feed." : "Log in and be the first to post."}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
