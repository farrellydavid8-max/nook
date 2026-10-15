-- Nook update 9: Letterboxd auto-sync.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

create table if not exists public.letterboxd_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lb_username text not null,
  code text not null,
  verified boolean default false,
  linked_at timestamptz default now(),
  last_synced_at timestamptz,
  sync_error text
);
create unique index if not exists letterboxd_links_verified_username on public.letterboxd_links (lower(lb_username)) where verified;
alter table public.letterboxd_links enable row level security;
drop policy if exists "see own letterboxd link" on public.letterboxd_links;
create policy "see own letterboxd link" on public.letterboxd_links for select using (auth.uid() = user_id);

-- Remembers which Letterboxd diary entry each synced log came from, so nothing is added twice
alter table public.posts add column if not exists external_id text;
-- (Empty values never clash, so ordinary logs are unaffected)
create unique index if not exists posts_external_id_unique on public.posts (user_id, external_id);

notify pgrst, 'reload schema';
