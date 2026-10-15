import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";

// Stop syncing. Logs already brought over stay, since they're part of your diary now.
export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await adminDb().from("letterboxd_links").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
