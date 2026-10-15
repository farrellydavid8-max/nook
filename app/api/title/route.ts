import { NextResponse } from "next/server";
import { getTitle } from "@/lib/catalog";

// GET /api/title?key=anilist-154587
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!/^[a-z]+-[\w.-]{1,120}$/i.test(key)) return NextResponse.json({ title: null }, { status: 400 });
  const title = await getTitle(key);
  return NextResponse.json({ title }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
