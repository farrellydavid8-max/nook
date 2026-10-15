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
  // Which kind of Supabase key it is (never the key itself)
  const k = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (k.startsWith("sb_secret_")) status.secretKeyKind = "secret";
  else if (k.startsWith("sb_publishable_")) status.secretKeyKind = "publishable (wrong key)";
  else if (k.startsWith("eyJ")) {
    try {
      const role = JSON.parse(Buffer.from(k.split(".")[1], "base64url").toString()).role;
      status.secretKeyKind = role === "service_role" ? "service_role" : `${role} (wrong key)`;
    } catch {
      status.secretKeyKind = "unreadable";
    }
  } else status.secretKeyKind = k ? "unknown" : "missing";
  try {
    const db = adminDb();
    const links = await db.from("steam_links").select("user_id", { count: "exact", head: true });
    status.steamLinksTable = links.error ? `error: ${links.error.message}` : "ok";
    const lib = await db.from("game_library").select("user_id", { count: "exact", head: true });
    status.gameLibraryTable = lib.error ? `error: ${lib.error.message}` : "ok";
    // A write that is meant to fail on the made-up account: proves whether writing is allowed at all
    const probe = await db.from("steam_links").upsert({ user_id: "00000000-0000-0000-0000-000000000000", steam_id: "0" });
    status.writeTest = probe.error ? `${probe.error.code}: ${probe.error.message}` : "wrote (unexpected)";
    if (!probe.error) await db.from("steam_links").delete().eq("user_id", "00000000-0000-0000-0000-000000000000");
  } catch (e) {
    status.database = e instanceof Error ? e.message : "error";
  }
  if (process.env.STEAM_API_KEY) {
    const r = await fetch(`https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/`, { cache: "no-store" }).catch(() => null);
    status.steamReachable = Boolean(r?.ok);
  }
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
