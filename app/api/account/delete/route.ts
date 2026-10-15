import { NextResponse } from "next/server";
import { adminDb, getServerUser } from "@/lib/server";

// Permanently delete the signed-in account: photos first, then the account,
// which removes the profile and everything linked to it.
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ ok: false, reason: "Log in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "DELETE") return NextResponse.json({ ok: false, reason: "Type DELETE to confirm." }, { status: 400 });

  const db = adminDb();

  // Remove uploaded photos (stored in a folder named after the account)
  const bucket = db.storage.from("photos");
  for (;;) {
    const { data } = await bucket.list(user.id, { limit: 100 });
    if (!data?.length) break;
    await bucket.remove(data.map((f) => `${user.id}/${f.name}`));
    if (data.length < 100) break;
  }

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ ok: false, reason: "Couldn't delete the account. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
