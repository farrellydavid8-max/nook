// Steam: confirm someone's Steam sign-in, and copy their games and playtime into Nook.

import "server-only";
import { adminDb } from "./server";

const KEY = process.env.STEAM_API_KEY;
const OPENID = "https://steamcommunity.com/openid/login";
const API = "https://api.steampowered.com";

export const steamPoster = (appid: number | string) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;

/* ---------- Sign in through Steam (OpenID 2.0) ---------- */

export function steamLoginUrl(origin: string) {
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}/api/steam/callback`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${OPENID}?${p}`;
}

// Ask Steam whether the sign-in it sent back is genuine; returns the 64-bit Steam ID.
export async function verifySteamLogin(params: URLSearchParams, origin: string): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") {
    console.error("steam openid: unexpected mode", params.get("openid.mode"));
    return null;
  }
  // Compare hosts only, so http/https or proxy differences don't break it
  const returnHost = (() => {
    try {
      return new URL(params.get("openid.return_to") ?? "").host;
    } catch {
      return "";
    }
  })();
  if (returnHost !== new URL(origin).host) {
    console.error("steam openid: return_to host mismatch", returnHost, origin);
    return null;
  }
  const check = new URLSearchParams(params);
  check.set("openid.mode", "check_authentication");
  const res = await fetch(OPENID, { method: "POST", body: check, headers: { "Content-Type": "application/x-www-form-urlencoded" }, cache: "no-store" });
  const text = await res.text();
  if (!/is_valid\s*:\s*true/.test(text)) {
    console.error("steam openid: not valid", res.status, text.slice(0, 200));
    return null;
  }
  const match = params.get("openid.claimed_id")?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  return match?.[1] ?? null;
}

/* ---------- Steam Web API ---------- */

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function steamApi(path: string, params: Record<string, string | number>): Promise<Json | null> {
  if (!KEY) throw new Error("STEAM_API_KEY is not set in Vercel");
  const q = new URLSearchParams({ key: KEY, format: "json", ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  try {
    const res = await fetch(`${API}/${path}?${q}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function achievements(steamId: string, appid: number) {
  const data = await steamApi("ISteamUserStats/GetPlayerAchievements/v1/", { steamid: steamId, appid });
  const list = data?.playerstats?.achievements as { achieved: number }[] | undefined;
  if (!list?.length) return null;
  return { done: list.filter((a) => a.achieved).length, total: list.length };
}

/* ---------- Sync one person's library ---------- */

export type SyncResult = { ok: true; games: number } | { ok: false; reason: string };

export async function syncSteam(userId: string): Promise<SyncResult> {
  const db = adminDb();
  const { data: link } = await db.from("steam_links").select("*").eq("user_id", userId).maybeSingle();
  if (!link) return { ok: false, reason: "Steam isn't connected." };
  const steamId = link.steam_id as string;

  const fail = async (reason: string): Promise<SyncResult> => {
    await db.from("steam_links").update({ sync_error: reason, last_synced_at: new Date().toISOString() }).eq("user_id", userId);
    return { ok: false, reason };
  };

  // Profile name, picture and privacy
  const summary = (await steamApi("ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId }))?.response?.players?.[0];
  if (!summary) return fail("Steam didn't answer. Try again in a few minutes.");
  const isPublic = summary.communityvisibilitystate === 3;

  // Owned games with playtime. Empty when "Game details" is private.
  const owned = (await steamApi("IPlayerService/GetOwnedGames/v1/", { steamid: steamId, include_appinfo: 1, include_played_free_games: 1 }))?.response?.games as
    | { appid: number; name: string; playtime_forever: number; rtime_last_played?: number }[]
    | undefined;

  await db
    .from("steam_links")
    .update({ steam_name: summary.personaname, avatar_url: summary.avatarfull, is_public: isPublic && Boolean(owned?.length) })
    .eq("user_id", userId);

  if (!owned?.length) {
    return fail("Your Steam game details are private. In Steam, set Profile → Edit Profile → Privacy Settings → Game details to Public, then sync again.");
  }

  // Only games you've actually played
  const played = owned.filter((g) => g.playtime_forever > 0);

  // Achievements for the games played in the last two weeks
  const recent = ((await steamApi("IPlayerService/GetRecentlyPlayedGames/v1/", { steamid: steamId, count: 10 }))?.response?.games ?? []) as { appid: number }[];
  const ach = new Map<number, { done: number; total: number }>();
  await Promise.all(
    recent.map(async (g) => {
      const a = await achievements(steamId, g.appid);
      if (a) ach.set(g.appid, a);
    })
  );

  const now = new Date().toISOString();
  const rows = played.map((g) => ({
    user_id: userId,
    title_key: `steam-${g.appid}`,
    title: g.name,
    medium: "Game",
    poster_url: steamPoster(g.appid),
    playtime_minutes: g.playtime_forever,
    last_played_at: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null,
    source: "steam",
    updated_at: now,
    ...(ach.has(g.appid) ? { achievements_done: ach.get(g.appid)!.done, achievements_total: ach.get(g.appid)!.total } : {}),
  }));

  // Save in chunks; rows without fresh achievement numbers keep their old ones
  const withAch = rows.filter((r) => "achievements_done" in r);
  const withoutAch = rows.filter((r) => !("achievements_done" in r));
  for (const group of [withAch, withoutAch]) {
    for (let i = 0; i < group.length; i += 500) {
      const { error } = await db.from("game_library").upsert(group.slice(i, i + 500), { onConflict: "user_id,title_key" });
      if (error) return fail("Couldn't save your games. Try syncing again.");
    }
  }

  await db.from("steam_links").update({ last_synced_at: now, sync_error: null }).eq("user_id", userId);
  return { ok: true, games: rows.length };
}
