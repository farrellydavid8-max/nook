"use client";

import { useParams } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import SetupNotice from "@/components/SetupNotice";
import { useStore } from "@/lib/store";

export default function UserPage() {
  const { username } = useParams<{ username: string }>();
  const { configured, loading } = useStore();
  if (!configured) return <SetupNotice />;
  if (loading) return <div className="empty">Loading…</div>;
  return <ProfileView username={decodeURIComponent(username)} />;
}
