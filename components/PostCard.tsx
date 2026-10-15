"use client";

import Link from "next/link";
import { useState } from "react";
import * as api from "@/lib/api";
import { REWATCH_LABEL, profileHref, stars, titleHref, type Post } from "@/lib/data";
import { useStore } from "@/lib/store";
import Comments from "./Comments";
import { HeartIcon, LinkIcon } from "./Icons";
import { Avatar, Poster, Shot } from "./Media";
import PostMenu from "./PostMenu";

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
    </svg>
  );
}

export default function PostCard({ post, onChanged = () => {} }: { post: Post; onChanged?: () => void }) {
  const { user, toast } = useStore();
  const t = post.title;
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [revealSpoiler, setRevealSpoiler] = useState(false);

  async function like() {
    if (!user) return toast("Log in to like posts");
    const now = !liked;
    setLiked(now);
    setLikes((n) => n + (now ? 1 : -1));
    try {
      await api.setLike(post.id, user.id, now);
    } catch {
      setLiked(!now);
      setLikes((n) => n + (now ? -1 : 1));
      toast("Couldn't save that like");
    }
  }

  const actions = (
    <div className="post-actions">
      <button className="like" aria-pressed={liked} aria-label={`Like, ${likes} likes`} onClick={like}>
        <HeartIcon size={18} />
        {likes}
      </button>
      <button className="like" aria-expanded={showComments} aria-label={`Comments, ${commentCount}`} onClick={() => setShowComments((s) => !s)}>
        <CommentIcon />
        {commentCount}
      </button>
    </div>
  );

  const action =
    post.type === "photo"
      ? "shared an update"
      : post.status === "In progress"
        ? "is partway through"
        : post.status === "Dropped"
          ? "dropped"
          : post.rewatch
            ? { Rewatch: "rewatched", Replay: "replayed", Reread: "reread" }[REWATCH_LABEL[t.medium]]
            : `logged ${t.medium === "Anime" ? "an anime" : t.medium === "Manga" ? "manga" : "a " + t.medium.toLowerCase()}`;

  return (
    <article className="post">
      <div className="who">
        <Link href={profileHref(post.user)} aria-label={`${post.user}'s profile`}>
          <Avatar name={post.user} color={post.avatarColor} url={post.avatarUrl} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={profileHref(post.user)} className="inline-title">
            {post.user}
          </Link>{" "}
          <span className="meta">
            {action} · {post.time}
          </span>
        </div>
        <PostMenu post={post} onChanged={onChanged} />
      </div>

      {post.type === "photo" ? (
        <>
          {post.caption && <p className="review update-text">{post.caption}</p>}
          {post.shots.length > 0 && (
            <div className={`grid3${post.shots.length === 1 ? " single" : ""}`} style={{ gridTemplateColumns: `repeat(${Math.min(post.shots.length, 3)}, minmax(0, 1fr))` }}>
              {post.shots.map((s, i) => (
                <Shot key={i} src={s} filter={post.filter} strength={post.strength} controls />
              ))}
            </div>
          )}
          <div className="postfoot">
            <span>
              from{" "}
              <Link href={titleHref(t)} className="inline-title">
                {t.name}
              </Link>{" "}
              <span className="meta">· {t.medium}</span>
            </span>
            {actions}
          </div>
        </>
      ) : (
        <>
          <div className="logrow">
            <Poster title={t} />
            <div style={{ minWidth: 0 }}>
              <Link href={titleHref(t)} className="ptitle">
                {t.name}
              </Link>
              <div className="sub">
                {[t.medium, t.year].filter(Boolean).join(" · ")}
                {post.progress ? ` · ${post.progress}` : ""}
              </div>
              {post.rating > 0 && (
                <div className="stars" aria-label={`${post.rating} stars`}>
                  {stars(post.rating)}
                  {post.rewatch && <span className="tag">{REWATCH_LABEL[t.medium]}</span>}
                </div>
              )}
              {post.text &&
                (post.spoiler && !revealSpoiler ? (
                  <button className="spoiler" onClick={() => setRevealSpoiler(true)}>
                    This review has spoilers. Tap to read.
                  </button>
                ) : (
                  <p className="review">{post.text}</p>
                ))}
            </div>
          </div>
          {post.shots.length > 0 && (
            <div
              className={`grid3${post.shots.length === 1 ? " single" : ""}`}
              style={{ marginTop: 12, gridTemplateColumns: `repeat(${Math.min(post.shots.length, 3)}, minmax(0, 1fr))` }}
            >
              {post.shots.map((s, i) => (
                <Shot key={i} src={s} filter="Raw" controls />
              ))}
            </div>
          )}
          {post.letterboxd && (
            <a className="lb" href={post.letterboxd} target="_blank" rel="noopener noreferrer">
              <LinkIcon size={16} />
              Full review on Letterboxd
            </a>
          )}
          <div className="postfoot" style={{ justifyContent: "flex-end" }}>
            {actions}
          </div>
        </>
      )}
      {showComments && <Comments postId={post.id} postOwnerId={post.userId} onCount={setCommentCount} />}
    </article>
  );
}
