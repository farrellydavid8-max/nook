import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";
import { syncSteam } from "@/lib/steam";

// "Sync now" from the profile. Limited to once every 5 minutes per person.
export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ ok: false, reason: "Log in first." }, { status: 401 });
  const { data: link } = await adminDb().from("steam_links").select("last_synced_at").eq("user_id", user.id).maybeSingle();
  if (!link) return NextResponse.json({ ok: false, reason: "Steam isn't connected." }, { status: 400 });
  if (link.last_synced_at && Date.now() - new Date(link.last_synced_at).getTime() < 5 * 60 * 1000) {
    return NextResponse.json({ ok: false, reason: "Synced a moment ago. Try again in a few minutes." }, { status: 429 });
  }
  return NextResponse.json(await syncSteam(user.id));
}
