"use client";

import Link from "next/link";
import { useState } from "react";
import PostCard from "@/components/PostCard";
import { BellIcon, SearchIcon } from "@/components/Icons";
import { findTitle, MEDIA, type Medium } from "@/lib/data";
import { useStore } from "@/lib/store";

export default function FeedPage() {
  const { posts, toast } = useStore();
  const [filter, setFilter] = useState<"All" | Medium>("All");
  const list = posts.filter((p) => filter === "All" || findTitle(p.title).medium === filter);

  return (
    <section className="screen" aria-label="Feed">
      <header className="topbar">
        <h1 className="wordmark">
          Nook<span>.</span>
        </h1>
        <div>
          <Link href="/title/dune-part-two" className="iconbtn" aria-label="Search">
            <SearchIcon />
          </Link>
          <button className="iconbtn" aria-label="Notifications" onClick={() => toast("No new notifications")}>
            <BellIcon />
          </button>
        </div>
      </header>

      <div className="chips" role="group" aria-label="Filter by medium">
        {(["All", ...Object.keys(MEDIA)] as ("All" | Medium)[]).map((k) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === "All" ? "All" : MEDIA[k]}
          </button>
        ))}
      </div>

      <div className="feed">
        {list.length ? (
          list.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <div className="empty">
            No {filter === "All" ? "posts" : MEDIA[filter].toLowerCase()} from your friends yet.
            <br />
            Log one with the + button.
          </div>
        )}
      </div>
      <p className="note">Sample posts for now. Real accounts come next.</p>
    </section>
  );
}
