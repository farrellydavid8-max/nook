-- Nook update 10: remember feed filter choices on your account (so they follow you between devices).
-- Paste into Supabase → SQL Editor → New query → Run.
alter table public.profiles add column if not exists feed_prefs jsonb;
notify pgrst, 'reload schema';
