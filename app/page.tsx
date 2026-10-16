"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FeedFilters, { useFeedFilters } from "@/components/FeedFilters";
import PostCard from "@/components/PostCard";
import SetupNotice from "@/components/SetupNotice";
import SideRail from "@/components/SideRail";
import { BellIcon, SearchIcon } from "@/components/Icons";
import { MEDIA } from "@/lib/data";
import { useStore } from "@/lib/store";
import { usePosts } from "@/lib/usePosts";

type Scope = "following" | "everyone";

export default function FeedPage() {
  const { configured, user, loading, following, unread } = useStore();
  const [scope, setScope] = useState<Scope>("everyone");
  const { prefs, save } = useFeedFilters();

  // Start on "Following" once we know you follow someone
  useEffect(() => {
    if (user && following.size > 0) setScope("following");
  }, [user, following.size > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const followIds = useMemo(() => (user ? [user.id, ...following] : []), [user, following]);
  const query = scope === "following" && user ? { userIds: followIds, limit: 80 } : { limit: 80 };
  const { posts, loaded, error, reload } = usePosts(configured && !loading ? query : null);
  // Nothing picked = everything; otherwise only the picked types
  const list = posts.filter((p) => (prefs.selected.length ? prefs.selected.includes(p.title.medium) : true));
  const filterName = prefs.selected.map((m) => MEDIA[m].toLowerCase()).join(" or ");

  return (
    <div className="feed-layout">
      <section className="screen" aria-label="Feed">
        <header className="topbar">
          <h1 className="wordmark">
            <span className="mobile-only">
              Nook<span className="dot">.</span>
            </span>
            <span className="desktop-only page-title">Your feed</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Link href="/explore" className="iconbtn" aria-label="Search">
              <SearchIcon />
            </Link>
            {user && (
              <Link href="/notifications" className="iconbtn mobile-only badge-wrap" aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
                <BellIcon />
                {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
              </Link>
            )}
            {!loading && !user && configured && (
              <Link href="/login" className="btn primary mobile-only" style={{ minHeight: 38 }}>
                Log in
              </Link>
            )}
          </div>
        </header>

        {!configured ? (
          <SetupNotice />
        ) : (
          <>
            {user && (
              <div className="tabs feed-tabs" role="tablist">
                <button role="tab" aria-selected={scope === "following"} onClick={() => setScope("following")}>
                  Following
                </button>
                <button role="tab" aria-selected={scope === "everyone"} onClick={() => setScope("everyone")}>
                  Everyone
                </button>
              </div>
            )}
            <FeedFilters prefs={prefs} save={save} />

            <div className="feed">
              {error ? (
                <div className="empty">The feed didn&apos;t load. Check your connection and refresh.</div>
              ) : !loaded ? (
                <div className="empty">Loading the feed…</div>
              ) : list.length ? (
                list.map((p) => <PostCard key={p.id} post={p} onChanged={reload} />)
              ) : scope === "following" && following.size === 0 ? (
                <div className="empty">
                  You&apos;re not following anyone yet.
                  <br />
                  Switch to <button className="linkbtn inline" onClick={() => setScope("everyone")}>Everyone</button> to find people, then follow them from their profile.
                </div>
              ) : (
                <div className="empty">
                  {prefs.selected.length ? `No ${filterName} posts yet.` : "Nothing here yet."}
                  <br />
                  {user ? "Log something with the + button." : "Log in and be the first to post."}
                </div>
              )}
            </div>
          </>
        )}
      </section>
      {configured && <SideRail posts={posts} />}
    </div>
  );
}
