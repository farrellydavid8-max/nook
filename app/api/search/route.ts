import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import { MEDIA, type Medium } from "@/lib/data";

// GET /api/search?q=elden&medium=Game
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const medium = searchParams.get("medium") as Medium;
  if (!q || !(medium in MEDIA)) return NextResponse.json({ results: [] });
  const results = await searchCatalog(q, medium);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
