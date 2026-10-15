"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import SetupNotice from "./SetupNotice";

// Wrap a page in this to send signed-out visitors to the login page first.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { configured, loading, user } = useStore();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (configured && !loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [configured, loading, user, router, path]);

  if (!configured) return <SetupNotice />;
  if (loading || !user) return <div className="empty">Loading…</div>;
  return <>{children}</>;
}
