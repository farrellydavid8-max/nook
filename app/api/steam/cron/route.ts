import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server";
import { syncSteam } from "@/lib/steam";

export const maxDuration = 60;

// Runs once a day (see vercel.json). Vercel sends the CRON_SECRET so strangers can't trigger it.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { data: links } = await adminDb().from("steam_links").select("user_id").order("last_synced_at", { ascending: true, nullsFirst: true }).limit(200);
  let synced = 0;
  const started = Date.now();
  for (const l of links ?? []) {
    if (Date.now() - started > 50_000) break; // stay inside the time limit; the oldest syncs go first next time
    const r = await syncSteam(l.user_id as string);
    if (r.ok) synced++;
  }
  return NextResponse.json({ ok: true, synced });
}
