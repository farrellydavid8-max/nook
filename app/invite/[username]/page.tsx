"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Media";
import * as api from "@/lib/api";
import { profileHref, type Profile } from "@/lib/data";
import { saveInvite } from "@/lib/invite";
import { useStore } from "@/lib/store";

// Where invite links land: who invited you, and one button to join.
export default function InvitePage() {
  const router = useRouter();
  const username = decodeURIComponent(useParams<{ username: string }>().username).toLowerCase();
  const { configured, user, following, toggleFollow } = useStore();
  const [inviter, setInviter] = useState<Profile | null | undefined>(undefined);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!configured) return;
    api.fetchProfileByUsername(username).then((p) => {
      setInviter(p);
      if (p) api.followCounts(p.id).then(setCounts);
    });
  }, [username, configured]);

  if (inviter === undefined) return <div className="empty">Loading…</div>;
  if (inviter === null) {
    return (
      <div className="empty">
        This invite link doesn&apos;t match anyone on Nook.{" "}
        <Link href="/login" style={{ color: "var(--accent)" }}>
          Join anyway
        </Link>
      </div>
    );
  }

  const isMe = user?.id === inviter.id;
  const follows = following.has(inviter.id);

  return (
    <section className="screen narrow invite" aria-label={`${inviter.username} invited you to Nook`}>
      <div className="invite-card" style={{ background: `linear-gradient(var(--surface), var(--surface)) padding-box, ${inviter.banner}` }}>
        <h1 className="wordmark" style={{ fontSize: 40 }}>
          Nook<span className="dot">.</span>
        </h1>
        <Avatar name={inviter.username} color={inviter.avatar_color} url={inviter.avatar_url} size={84} />
        <p className="invite-line">
          <strong>{inviter.username}</strong> invited you to Nook
        </p>
        {inviter.bio && <p className="review">{inviter.bio}</p>}
        <p className="sub">
          {counts.followers} {counts.followers === 1 ? "follower" : "followers"} · {counts.following} following
        </p>
        <p className="review" style={{ maxWidth: 380 }}>
          Log and review everything you watch, play and read: films, shows, games, anime, books, manga and comics. Share photos, make lists, and see what your friends are into.
        </p>

        {isMe ? (
          <p className="sub">This is your invite link. Send it to friends; when they join, you&apos;ll follow each other.</p>
        ) : user ? (
          <div className="invite-actions">
            <button className={`btn${follows ? "" : " primary"}`} onClick={() => toggleFollow(inviter.id)}>
              {follows ? "Following" : `Follow ${inviter.username}`}
            </button>
            <Link href={profileHref(inviter.username)} className="btn">
              See their profile
            </Link>
          </div>
        ) : (
          <div className="invite-actions">
            <button
              className="btn primary"
              onClick={() => {
                saveInvite(inviter.username);
                router.push(`/login?invite=${encodeURIComponent(inviter.username)}`);
              }}
            >
              Join Nook
            </button>
            <Link href={profileHref(inviter.username)} className="btn">
              Look around first
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
