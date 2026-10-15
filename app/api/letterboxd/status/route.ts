import { NextResponse } from "next/server";

// A setup check: can Nook's server read a Letterboxd profile page and diary feed?
export async function GET(req: Request) {
  const u = (new URL(req.url).searchParams.get("u") ?? "").replace(/[^A-Za-z0-9_]/g, "");
  if (!u) return NextResponse.json({ ok: false });
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  const check = async (url: string) => {
    try {
      const r = await fetch(url, { headers, cache: "no-store" });
      const t = await r.text();
      return { status: r.status, length: t.length, hasNook: /nook-[a-z0-9]{6}/.test(t) };
    } catch (e) {
      return { status: 0, error: e instanceof Error ? e.message : "failed" };
    }
  };
  return NextResponse.json(
    { profile: await check(`https://letterboxd.com/${u}/`), rss: await check(`https://letterboxd.com/${u}/rss/`) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
