"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useStore } from "@/lib/store";

// "Profile" in the menu goes to your own public page, /u/yourname
function GoToMyProfile() {
  const router = useRouter();
  const { profile, toast } = useStore();
  useEffect(() => {
    if (!profile) return;
    // Coming back from connecting Steam
    const steam = new URLSearchParams(window.location.search).get("steam");
    const messages: Record<string, string> = {
      linked: "Steam connected. Your games are on your profile.",
      private: "Steam connected, but your game details are private. Make them public in Steam, then tap Sync now in Customize.",
      taken: "That Steam account is already connected to a different Nook account.",
      failed: "Steam sign-in didn't go through. Try connecting again.",
      dberror: "Steam signed you in, but Nook couldn't save the connection. The database update or secret key still needs setting up.",
    };
    if (steam && messages[steam]) toast(messages[steam]);
    router.replace(`/u/${profile.username}`);
  }, [profile, router, toast]);
  return <div className="empty">{profile ? "Opening your profile…" : "Setting up your profile… If this doesn't go away, log out and back in."}</div>;
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <GoToMyProfile />
    </RequireAuth>
  );
}
