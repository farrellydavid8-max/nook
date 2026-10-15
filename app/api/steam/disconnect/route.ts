import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";

// Unlink Steam and remove the games it added. Logs and reviews you wrote yourself stay.
export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const db = adminDb();
  await db.from("game_library").delete().eq("user_id", user.id).eq("source", "steam");
  await db.from("steam_links").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
