// Letterboxd: confirm an account is yours, then copy new diary entries into Nook as logs.
// Letterboxd has no public sign-in for apps, so we read each person's public diary feed.

import "server-only";
import { getTitle } from "./catalog";
import { adminDb } from "./server";

const UA = "Mozilla/5.0 (compatible; NookBot/1.0; +https://nook-drab.vercel.app)";
export const LB_USERNAME = /^[A-Za-z0-9_]{2,40}$/;

async function getText(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/rss+xml,application/xml" }, cache: "no-store" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

export type DiaryEntry = {
  guid: string;
  link: string;
  title: string;
  year?: number;
  tmdbId?: string;
  rating?: number;
  rewatch: boolean;
  watched?: string;
  published?: string;
  poster?: string;
  review: string;
  spoiler: boolean;
};

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() : undefined;
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

// Read the public RSS diary feed. Only film diary entries are returned (lists are skipped).
export async function readDiary(username: string): Promise<DiaryEntry[] | null> {
  const xml = await getText(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`);
  if (!xml) return null;
  const items = xml.split("<item>").slice(1).map((s) => s.split("</item>")[0]);
  return items
    .filter((it) => tag(it, "letterboxd:filmTitle"))
    .map((it) => {
      const html = tag(it, "description") ?? "";
      const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
      const poster = html.match(/<img src="([^"]+)"/)?.[1];
      const spoiler = paragraphs.some((p) => /may contain spoilers/i.test(p));
      const review = paragraphs
        .filter((p) => !/<img/.test(p) && !/^\s*Watched on /i.test(p) && !/may contain spoilers/i.test(p))
        .map((p) => decode(p.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim())
        .filter(Boolean)
        .join("\n\n");
      const rating = Number(tag(it, "letterboxd:memberRating"));
      return {
        guid: tag(it, "guid") ?? tag(it, "link") ?? "",
        link: tag(it, "link") ?? "",
        title: decode(tag(it, "letterboxd:filmTitle") ?? ""),
        year: Number(tag(it, "letterboxd:filmYear")) || undefined,
        tmdbId: tag(it, "tmdb:movieId") || undefined,
        rating: rating > 0 ? rating : undefined,
        rewatch: (tag(it, "letterboxd:rewatch") ?? "").toLowerCase() === "yes",
        watched: tag(it, "letterboxd:watchedDate"),
        published: tag(it, "pubDate"),
        poster,
        review,
        spoiler,
      };
    })
    .filter((e) => e.guid && e.title);
}

// Ownership check: the code must appear in their Letterboxd bio, or anywhere in their public feed
// (for example as the name of a new list), which only the account owner can change.
export async function codeIsPublished(username: string, code: string) {
  const profile = await getText(`https://letterboxd.com/${encodeURIComponent(username)}/`);
  if (profile?.includes(code)) return true;
  const feed = await getText(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`);
  return Boolean(feed?.includes(code));
}

export async function letterboxdExists(username: string) {
  return (await readDiary(username)) !== null;
}

export type LbSyncResult = { ok: true; added: number } | { ok: false; reason: string };

export async function syncLetterboxd(userId: string): Promise<LbSyncResult> {
  const db = adminDb();
  const { data: link } = await db.from("letterboxd_links").select("*").eq("user_id", userId).maybeSingle();
  if (!link?.verified) return { ok: false, reason: "Letterboxd isn't connected." };

  const fail = async (reason: string): Promise<LbSyncResult> => {
    await db.from("letterboxd_links").update({ sync_error: reason, last_synced_at: new Date().toISOString() }).eq("user_id", userId);
    return { ok: false, reason };
  };

  const entries = await readDiary(link.lb_username);
  if (!entries) return fail("Couldn't read your Letterboxd diary. Check the username, or try again later.");

  // Skip entries already synced, and films already logged for the same day (for example from a CSV import)
  const { data: existing } = await db
    .from("posts")
    .select("external_id,title_key,logged_on,letterboxd_url")
    .eq("user_id", userId)
    .eq("type", "log")
    .order("created_at", { ascending: false })
    .limit(2000);
  const seenIds = new Set((existing ?? []).map((p) => p.external_id).filter(Boolean));
  const seenUrls = new Set((existing ?? []).map((p) => p.letterboxd_url).filter(Boolean));
  const seenDay = new Set((existing ?? []).map((p) => `${p.title_key}|${p.logged_on}`));
  const fresh = entries.filter(
    (e) => !seenIds.has(e.guid) && !seenUrls.has(e.link) && !(e.tmdbId && seenDay.has(`tmdb-${e.tmdbId}|${e.watched}`))
  );

  // Use TMDB's poster and director when we can; otherwise Letterboxd's poster
  const rows = await Promise.all(
    fresh.map(async (e) => {
      const key = e.tmdbId ? `tmdb-${e.tmdbId}` : `manual-film.${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
      const details = e.tmdbId ? await getTitle(key).catch(() => null) : null;
      const created = e.published && !isNaN(Date.parse(e.published)) ? new Date(e.published).toISOString() : e.watched ? `${e.watched}T12:00:00Z` : new Date().toISOString();
      return {
        user_id: userId,
        type: "log",
        title: details?.name ?? e.title,
        title_key: key,
        medium: "Film",
        year: details?.year ?? e.year ?? null,
        creator: details?.creator ?? null,
        poster_url: details?.poster ?? e.poster ?? null,
        status: "Finished",
        logged_on: e.watched ?? null,
        rating: e.rating ?? null,
        review: e.review || null,
        spoiler: e.spoiler,
        rewatch: e.rewatch,
        letterboxd_url: e.link || null,
        external_id: e.guid,
        created_at: created,
      };
    })
  );

  if (rows.length) {
    const { error } = await db.from("posts").upsert(rows, { onConflict: "user_id,external_id", ignoreDuplicates: true });
    if (error) return fail("Couldn't save your Letterboxd diary. Try syncing again.");
  }
  await db.from("letterboxd_links").update({ last_synced_at: new Date().toISOString(), sync_error: null }).eq("user_id", userId);
  return { ok: true, added: rows.length };
}
