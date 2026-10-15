import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";
import { LB_USERNAME, letterboxdExists } from "@/lib/letterboxd";

// Step 1: someone types their Letterboxd username; give them a code to put in their bio.
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ ok: false, reason: "Log in first." }, { status: 401 });
  const { username } = await req.json().catch(() => ({}));
  const name = String(username ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?letterboxd\.com\//i, "").replace(/\/.*$/, "");
  if (!LB_USERNAME.test(name)) return NextResponse.json({ ok: false, reason: "That doesn't look like a Letterboxd username." }, { status: 400 });
  if (!(await letterboxdExists(name))) return NextResponse.json({ ok: false, reason: `Couldn't find a Letterboxd account called ${name}.` }, { status: 404 });

  const db = adminDb();
  const { data: taken } = await db.from("letterboxd_links").select("user_id").ilike("lb_username", name).eq("verified", true).maybeSingle();
  if (taken && taken.user_id !== user.id) return NextResponse.json({ ok: false, reason: "That Letterboxd account is already connected to someone else." }, { status: 409 });

  const code = `nook-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await db.from("letterboxd_links").upsert({ user_id: user.id, lb_username: name, code, verified: false, sync_error: null });
  if (error) return NextResponse.json({ ok: false, reason: "Couldn't start connecting. The database update for Letterboxd may still need running." }, { status: 500 });
  return NextResponse.json({ ok: true, code, username: name });
}
