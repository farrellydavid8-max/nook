"use client";

import { useStore } from "@/lib/store";

// Follow / Following / Requested (tapping Requested cancels the request).
export default function FollowButton({ userId, isPrivate = false, small = false }: { userId: string; isPrivate?: boolean | null; small?: boolean }) {
  const { user, following, requested, toggleFollow } = useStore();
  if (user?.id === userId) return null;
  const isFollowing = following.has(userId);
  const isRequested = requested.has(userId);
  const label = isFollowing ? "Following" : isRequested ? "Requested" : isPrivate ? "Request to follow" : "Follow";
  return (
    <button
      className={`btn${small ? " small" : ""}${isFollowing || isRequested ? "" : " primary"}`}
      aria-pressed={isFollowing || isRequested}
      title={isRequested ? "Tap to cancel your request" : undefined}
      onClick={() => toggleFollow(userId)}
    >
      {label}
    </button>
  );
}
