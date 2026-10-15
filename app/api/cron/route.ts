import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server";
import { syncLetterboxd } from "@/lib/letterboxd";
import { syncSteam } from "@/lib/steam";

export const maxDuration = 60;

// The daily sync (see vercel.json): Steam libraries and Letterboxd diaries, oldest first.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = adminDb();
  const started = Date.now();
  const inTime = () => Date.now() - started < 50_000;
  let steam = 0;
  let letterboxd = 0;

  const { data: lb } = await db.from("letterboxd_links").select("user_id").eq("verified", true).order("last_synced_at", { ascending: true, nullsFirst: true }).limit(200);
  for (const l of lb ?? []) {
    if (!inTime()) break;
    if ((await syncLetterboxd(l.user_id as string)).ok) letterboxd++;
  }
  const { data: st } = await db.from("steam_links").select("user_id").order("last_synced_at", { ascending: true, nullsFirst: true }).limit(200);
  for (const l of st ?? []) {
    if (!inTime()) break;
    if ((await syncSteam(l.user_id as string)).ok) steam++;
  }
  return NextResponse.json({ ok: true, steam, letterboxd });
}
