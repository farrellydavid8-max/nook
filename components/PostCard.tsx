"use client";

import Link from "next/link";
import { stars, titleHref, type Post } from "@/lib/data";
import { useStore } from "@/lib/store";
import { HeartIcon, LinkIcon } from "./Icons";
import { Avatar, Poster, Shot } from "./Media";

export default function PostCard({ post }: { post: Post }) {
  const { toggleLike } = useStore();
  const t = post.title;

  const likeButton = (
    <button className="like" aria-pressed={post.liked} aria-label={`Like, ${post.likes} likes`} onClick={() => toggleLike(post)}>
      <HeartIcon size={18} />
      {post.likes}
    </button>
  );

  const action =
    post.type === "photo"
      ? `posted ${post.shots.length} ${post.shots.length === 1 ? "shot" : "shots"}`
      : `logged ${t.medium === "Anime" ? "an anime" : t.medium === "Manga" ? "manga" : "a " + t.medium.toLowerCase()}`;

  return (
    <article className="post">
      <div className="who">
        <Avatar name={post.user} color={post.avatarColor} />
        <div>
          <strong>{post.user}</strong>{" "}
          <span className="meta">
            {action} · {post.time}
          </span>
        </div>
      </div>

      {post.type === "photo" ? (
        <>
          <div className="grid3" style={{ gridTemplateColumns: `repeat(${Math.min(post.shots.length, 3)}, minmax(0, 1fr))` }}>
            {post.shots.map((s, i) => (
              <Shot key={i} src={s} filter={post.filter} strength={post.strength} />
            ))}
          </div>
          {post.caption && <p className="review">{post.caption}</p>}
          <div className="postfoot">
            <span>
              from{" "}
              <Link href={titleHref(t)} className="inline-title">
                {t.name}
              </Link>{" "}
              <span className="meta">· {t.medium}</span>
            </span>
            {likeButton}
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
                {post.status && post.status !== "Finished" ? ` · ${post.status}` : ""}
              </div>
              {post.rating > 0 && (
                <div className="stars" aria-label={`${post.rating} stars`}>
                  {stars(post.rating)}
                </div>
              )}
              {post.spoiler ? <p className="review meta">Review hidden: contains spoilers</p> : post.text && <p className="review">{post.text}</p>}
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
