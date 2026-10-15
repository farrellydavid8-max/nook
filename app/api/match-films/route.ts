import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog";
import type { TitleRef } from "@/lib/data";

// POST /api/match-films  { films: [{ name, year }] }  → the best catalog match for each (up to 25 at a time)
export async function POST(req: Request) {
  let films: { name: string; year?: number }[] = [];
  try {
    const body = await req.json();
    films = (Array.isArray(body.films) ? body.films : []).slice(0, 25);
  } catch {
    return NextResponse.json({ matches: [] }, { status: 400 });
  }

  const matches = await Promise.all(
    films.map(async (f): Promise<TitleRef | null> => {
      const name = String(f.name ?? "").slice(0, 200);
      if (!name) return null;
      const results = await searchCatalog(name, "Film");
      if (!results.length) return null;
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      // Prefer the same name and year, then the same year, then the top result
      return (
        results.find((r) => norm(r.name) === norm(name) && r.year === f.year) ??
        results.find((r) => r.year === f.year) ??
        results.find((r) => norm(r.name) === norm(name)) ??
        results[0]
      );
    })
  );
  return NextResponse.json({ matches });
}
