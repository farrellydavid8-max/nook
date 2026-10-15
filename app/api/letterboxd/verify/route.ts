import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";
import { codeIsPublished, syncLetterboxd } from "@/lib/letterboxd";

// Step 2: check the code is on their Letterboxd, then do the first sync.
export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ ok: false, reason: "Log in first." }, { status: 401 });
  const db = adminDb();
  const { data: link } = await db.from("letterboxd_links").select("*").eq("user_id", user.id).maybeSingle();
  if (!link) return NextResponse.json({ ok: false, reason: "Start by entering your Letterboxd username." }, { status: 400 });

  if (!link.verified) {
    if (!(await codeIsPublished(link.lb_username, link.code))) {
      return NextResponse.json({
        ok: false,
        reason: `Couldn't find ${link.code} on letterboxd.com/${link.lb_username} yet. Save it in your bio, wait a few seconds, and try again.`,
      });
    }
    await db.from("letterboxd_links").update({ verified: true }).eq("user_id", user.id);
    // Fill in the profile's Letterboxd link if it's empty
    await db
      .from("profiles")
      .update({ letterboxd_url: `https://letterboxd.com/${link.lb_username}/` })
      .eq("id", user.id)
      .is("letterboxd_url", null);
  }
  const result = await syncLetterboxd(user.id);
  return NextResponse.json(result.ok ? { ok: true, added: result.added } : result);
}
