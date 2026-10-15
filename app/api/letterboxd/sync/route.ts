import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";
import { syncLetterboxd } from "@/lib/letterboxd";

// "Sync now" for Letterboxd. Limited to once every 5 minutes.
export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ ok: false, reason: "Log in first." }, { status: 401 });
  const { data: link } = await adminDb().from("letterboxd_links").select("last_synced_at,verified").eq("user_id", user.id).maybeSingle();
  if (!link?.verified) return NextResponse.json({ ok: false, reason: "Letterboxd isn't connected." }, { status: 400 });
  if (link.last_synced_at && Date.now() - new Date(link.last_synced_at).getTime() < 5 * 60 * 1000) {
    return NextResponse.json({ ok: false, reason: "Synced a moment ago. Try again in a few minutes." }, { status: 429 });
  }
  return NextResponse.json(await syncLetterboxd(user.id));
}
