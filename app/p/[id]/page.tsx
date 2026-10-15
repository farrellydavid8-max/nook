"use client";

import { useParams, useRouter } from "next/navigation";
import { BackIcon } from "@/components/Icons";
import PostCard from "@/components/PostCard";
import { useStore } from "@/lib/store";
import { usePosts } from "@/lib/usePosts";

// A single post, so notifications and shared links can point straight to it.
export default function PostPage() {
  const router = useRouter();
  const id = Number(useParams<{ id: string }>().id);
  const { configured, loading } = useStore();
  const { posts, loaded, reload } = usePosts(configured && !loading && id ? { postId: id, limit: 1 } : null);

  return (
    <section className="screen narrow" aria-label="Post">
      <header className="sheethead">
        <button className="iconbtn" aria-label="Back" onClick={() => router.back()}>
          <BackIcon />
        </button>
      </header>
      {!loaded ? (
        <div className="empty">Loading…</div>
      ) : posts[0] ? (
        <PostCard post={posts[0]} onChanged={reload} />
      ) : (
        <div className="empty">This post was deleted or doesn&apos;t exist.</div>
      )}
    </section>
  );
}
