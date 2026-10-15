import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server";
import { steamLoginUrl } from "@/lib/steam";

// Step 1: send the signed-in person to Steam's own sign-in page.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const user = await getServerUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/profile`);
  return NextResponse.redirect(steamLoginUrl(origin));
}
