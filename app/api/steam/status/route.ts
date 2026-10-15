import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server";

// A setup check: says which Steam settings are in place, without revealing any of them.
export async function GET() {
  const status: Record<string, string | boolean> = {
    steamKeySet: Boolean(process.env.STEAM_API_KEY),
    secretKeySet: Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
    secretKeyLooksRight: /^(sb_secret_|eyJ)/.test(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""),
    cronSecretSet: Boolean(process.env.CRON_SECRET),
  };
  try {
    const db = adminDb();
    const links = await db.from("steam_links").select("user_id", { count: "exact", head: true });
    status.steamLinksTable = links.error ? `error: ${links.error.message}` : "ok";
    const lib = await db.from("game_library").select("user_id", { count: "exact", head: true });
    status.gameLibraryTable = lib.error ? `error: ${lib.error.message}` : "ok";
  } catch (e) {
    status.database = e instanceof Error ? e.message : "error";
  }
  if (process.env.STEAM_API_KEY) {
    const r = await fetch(`https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/`, { cache: "no-store" }).catch(() => null);
    status.steamReachable = Boolean(r?.ok);
  }
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
