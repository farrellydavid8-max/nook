-- Nook update 7: profile pictures and banner photos.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.
-- (Images go in the existing "photos" storage folder each person already owns.)
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;
notify pgrst, 'reload schema';
