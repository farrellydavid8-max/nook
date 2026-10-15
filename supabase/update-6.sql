-- Nook update 6: app colors (each person's chosen background color).
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.
alter table public.profiles add column if not exists theme_bg text default '#0F0F10' check (theme_bg ~* '^#[0-9a-f]{6}$');
notify pgrst, 'reload schema';
