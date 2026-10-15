-- Nook update 4: Steam linking and the quiet games library.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- Which Steam account belongs to which Nook account.
-- Only Nook's server writes here (after Steam confirms the sign-in), so there are no write policies.
create table if not exists public.steam_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  steam_id text unique not null,
  steam_name text,
  avatar_url text,
  is_public boolean default true,
  linked_at timestamptz default now(),
  last_synced_at timestamptz,
  sync_error text
);
alter table public.steam_links enable row level security;
drop policy if exists "see own steam link" on public.steam_links;
create policy "see own steam link" on public.steam_links for select using (auth.uid() = user_id);

-- Games synced from Steam. Anyone can see someone's library; only the server writes it.
create table if not exists public.game_library (
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_key text not null,
  title text not null,
  medium text not null default 'Game',
  poster_url text,
  playtime_minutes int default 0,
  last_played_at timestamptz,
  achievements_done int,
  achievements_total int,
  source text default 'steam',
  updated_at timestamptz default now(),
  primary key (user_id, title_key)
);
create index if not exists game_library_recent_idx on public.game_library (user_id, last_played_at desc nulls last);
alter table public.game_library enable row level security;
drop policy if exists "libraries are public" on public.game_library;
create policy "libraries are public" on public.game_library for select using (true);
