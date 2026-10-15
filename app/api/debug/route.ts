import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server";

// Temporary check: how many posts a username has, and whether the app's normal query can read them.
export async function GET(req: Request) {
  const u = (new URL(req.url).searchParams.get("u") ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const db = adminDb();
  const { data: p } = await db.from("profiles").select("id").eq("username", u).maybeSingle();
  if (!p) return NextResponse.json({ found: false });
  const all = await db.from("posts").select("id,type,title,external_id,created_at,logged_on").eq("user_id", p.id).order("created_at", { ascending: false }).limit(5);
  const count = await db.from("posts").select("*", { count: "exact", head: true }).eq("user_id", p.id);
  const lb = await db.from("posts").select("*", { count: "exact", head: true }).eq("user_id", p.id).not("external_id", "is", null);
  const appQuery = await db
    .from("posts")
    .select("id,user_id,type,title,title_key,medium,year,creator,poster_url,status,progress,logged_on,rating,review,letterboxd_url,spoiler,rewatch,photos,filter,filter_strength,caption,created_at,author:profiles(username,avatar_color,avatar_url),likes(user_id),comments(count)")
    .eq("user_id", p.id)
    .limit(3);
  return NextResponse.json(
    { total: count.count, fromLetterboxd: lb.count, latest: all.data, appQueryError: appQuery.error?.message ?? null, appQueryRows: appQuery.data?.length ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
