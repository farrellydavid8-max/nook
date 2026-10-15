"use client";

import Link from "next/link";
import { findTitle, slugify, stars, type Post } from "@/lib/data";
import { useStore } from "@/lib/store";
import { HeartIcon, LinkIcon } from "./Icons";
import { Avatar, Poster, Shot } from "./Media";

export default function PostCard({ post }: { post: Post }) {
  const { liked, toggleLike } = useStore();
  const t = findTitle(post.title);
  const isLiked = liked.has(post.id);
  const count = post.likes + (isLiked ? 1 : 0);
  const titleHref = `/title/${slugify(post.title)}`;

  const likeButton = (
    <button
      className="like"
      aria-pressed={isLiked}
      aria-label={`Like, ${count} likes`}
      onClick={() => toggleLike(post.id)}
    >
      <HeartIcon size={18} />
      {count}
    </button>
  );

  const action =
    post.type === "photo"
      ? `posted ${post.shots.length} ${post.shots.length > 1 ? "shots" : "shot"}`
      : `logged ${t.medium === "Anime" ? "an anime" : "a " + t.medium.toLowerCase()}`;

  return (
    <article className="post">
      <div className="who">
        <Avatar user={post.user} />
        <div>
          <strong>{post.user}</strong>{" "}
          <span className="meta">
            {action} · {post.time}
          </span>
        </div>
      </div>

      {post.type === "photo" ? (
        <>
          <div
            className="grid3"
            style={{ gridTemplateColumns: `repeat(${Math.min(post.shots.length, 3)}, minmax(0, 1fr))` }}
          >
            {post.shots.map((s, i) => (
              <Shot key={i} src={s} filter={post.filter} />
            ))}
          </div>
          {post.caption && <p className="review">{post.caption}</p>}
          <div className="postfoot">
            <span>
              from{" "}
              <Link href={titleHref} className="inline-title">
                {post.title}
              </Link>{" "}
              <span className="meta">· {t.medium}</span>
            </span>
            {likeButton}
          </div>
        </>
      ) : (
        <>
          <div className="logrow">
            <Poster title={post.title} />
            <div style={{ minWidth: 0 }}>
              <Link href={titleHref} className="ptitle">
                {post.title}
              </Link>
              <div className="sub">
                {t.medium} · {t.year}
              </div>
              <div className="stars" aria-label={`${post.rating} stars`}>
                {stars(post.rating)}
              </div>
              {post.spoiler ? (
                <p className="review meta">Review hidden: contains spoilers</p>
              ) : (
                post.text && <p className="review">{post.text}</p>
              )}
            </div>
          </div>
          {post.letterboxd && (
            <a className="lb" href={post.letterboxd} target="_blank" rel="noopener noreferrer">
              <LinkIcon size={16} />
              Full review on Letterboxd
            </a>
          )}
          <div className="postfoot" style={{ justifyContent: "flex-end" }}>
            {likeButton}
          </div>
        </>
      )}
    </article>
  );
}
