"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// These come from Vercel → Settings → Environment Variables.
// Supabase calls the key either "publishable" (new projects) or "anon" (older ones); both work.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isConfigured) throw new Error("Supabase is not set up yet. Add the two environment variables in Vercel.");
  if (!client) client = createBrowserClient(url!, key!);
  return client;
}
