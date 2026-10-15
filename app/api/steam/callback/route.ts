import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";
import { syncSteam, verifySteamLogin } from "@/lib/steam";

// Step 2: Steam sends people back here. Confirm it's genuine, save the link, then sync.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (status: string) => NextResponse.redirect(`${url.origin}/profile?steam=${status}`);

  const user = await getServerUser();
  if (!user) return NextResponse.redirect(`${url.origin}/login?next=/profile`);

  const steamId = await verifySteamLogin(url.searchParams, url.origin);
  if (!steamId) return back("failed");

  let db;
  try {
    db = adminDb();
  } catch {
    return back("dberror");
  }
  const { data: taken } = await db.from("steam_links").select("user_id").eq("steam_id", steamId).maybeSingle();
  if (taken && taken.user_id !== user.id) return back("taken");

  const { error } = await db.from("steam_links").upsert({ user_id: user.id, steam_id: steamId, linked_at: new Date().toISOString() });
  if (error) {
    console.error("steam link save failed", error.message);
    return back("dberror");
  }

  const result = await syncSteam(user.id);
  return back(result.ok ? "linked" : "private");
}
