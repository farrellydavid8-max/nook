"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useStore } from "@/lib/store";

// "Profile" in the menu goes to your own public page, /u/yourname
function GoToMyProfile() {
  const router = useRouter();
  const { profile } = useStore();
  useEffect(() => {
    if (profile) router.replace(`/u/${profile.username}`);
  }, [profile, router]);
  return <div className="empty">{profile ? "Opening your profile…" : "Setting up your profile… If this doesn't go away, log out and back in."}</div>;
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <GoToMyProfile />
    </RequireAuth>
  );
}
