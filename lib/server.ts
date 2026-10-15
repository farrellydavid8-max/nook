// Server-only helpers: who is signed in (from their cookies), and an admin
// database client for writes that people must not be able to fake.

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Supabase calls this the "secret" key (new projects) or "service_role" key (older ones). Never expose it to browsers.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function getServerUser() {
  const store = await cookies();
  const sb = createServerClient(url, publicKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a place that can't set cookies; the session still works for this request.
        }
      },
    },
  });
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export function adminDb() {
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not set in Vercel");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
