-- Nook update 3: following, comments, notifications, lists, watchlist,
-- favorites, rewatches, reporting and blocking.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- Title details from catalog search (from update 2, repeated here in case it was skipped)
alter table public.posts add column if not exists title_key text;
alter table public.posts add column if not exists year int;
alter table public.posts add column if not exists creator text;
alter table public.posts add column if not exists poster_url text;
create index if not exists posts_title_key_idx on public.posts (title_key);

-- Posts: rewatch / replay / reread flag
alter table public.posts add column if not exists rewatch boolean default false;
create index if not exists posts_user_idx on public.posts (user_id, created_at desc);

-- Profiles: hand-picked top 4
alter table public.profiles add column if not exists favorites jsonb default '[]'::jsonb;

-- Following
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows are public" on public.follows;
create policy "follows are public" on public.follows for select using (true);
drop policy if exists "follow as yourself" on public.follows;
create policy "follow as yourself" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "unfollow as yourself" on public.follows;
create policy "unfollow as yourself" on public.follows for delete using (auth.uid() = follower_id);

-- Comments
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;
drop policy if exists "comments are public" on public.comments;
create policy "comments are public" on public.comments for select using (true);
drop policy if exists "comment as yourself" on public.comments;
create policy "comment as yourself" on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists "delete own or on own post" on public.comments;
create policy "delete own or on own post" on public.comments for delete using (
  auth.uid() = user_id or auth.uid() = (select p.user_id from public.posts p where p.id = post_id)
);

-- Notifications (created automatically by the triggers below)
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment')),
  post_id bigint references public.posts (id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "see own notifications" on public.notifications;
create policy "see own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications for update using (auth.uid() = user_id);

create or replace function public.notify_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end; $$;
drop trigger if exists on_like on public.likes;
create trigger on_like after insert on public.likes for each row execute function public.notify_like();

create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'comment', new.post_id);
  end if;
  return new;
end; $$;
drop trigger if exists on_comment on public.comments;
create trigger on_comment after insert on public.comments for each row execute function public.notify_comment();

create or replace function public.notify_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, type) values (new.following_id, new.follower_id, 'follow');
  return new;
end; $$;
drop trigger if exists on_follow on public.follows;
create trigger on_follow after insert on public.follows for each row execute function public.notify_follow();

-- Lists
create table if not exists public.lists (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text default '' check (char_length(description) <= 500),
  created_at timestamptz default now()
);
create table if not exists public.list_items (
  list_id bigint not null references public.lists (id) on delete cascade,
  title_key text not null,
  title text not null,
  medium text not null,
  year int,
  creator text,
  poster_url text,
  added_at timestamptz default now(),
  primary key (list_id, title_key)
);
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
drop policy if exists "lists are public" on public.lists;
create policy "lists are public" on public.lists for select using (true);
drop policy if exists "manage own lists" on public.lists;
create policy "manage own lists" on public.lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "list items are public" on public.list_items;
create policy "list items are public" on public.list_items for select using (true);
drop policy if exists "manage items in own lists" on public.list_items;
create policy "manage items in own lists" on public.list_items for all
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- Watchlist ("Want to")
create table if not exists public.watchlist (
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_key text not null,
  title text not null,
  medium text not null,
  year int,
  creator text,
  poster_url text,
  created_at timestamptz default now(),
  primary key (user_id, title_key)
);
alter table public.watchlist enable row level security;
drop policy if exists "watchlists are public" on public.watchlist;
create policy "watchlists are public" on public.watchlist for select using (true);
drop policy if exists "manage own watchlist" on public.watchlist;
create policy "manage own watchlist" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports (only the reporter can create; you review them in the Supabase table editor)
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id bigint references public.posts (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
drop policy if exists "report as yourself" on public.reports;
create policy "report as yourself" on public.reports for insert with check (auth.uid() = reporter_id);

-- Blocks
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "see own blocks" on public.blocks;
create policy "see own blocks" on public.blocks for select using (auth.uid() = blocker_id);
drop policy if exists "manage own blocks" on public.blocks;
create policy "manage own blocks" on public.blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- Sign-up: give Google sign-ins (which have no username yet) a temporary one
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
  if wanted !~ '^[a-z0-9_]{3,20}$' or exists (select 1 from public.profiles where username = wanted) then
    wanted := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into public.profiles (id, username, avatar_color)
  values (
    new.id,
    wanted,
    (array['#5B4A6E','#3F5A3A','#6E4A4A','#4A5A6E','#6E5A3A','#5A3A5A'])[1 + floor(random() * 6)::int]
  );
  return new;
end;
$$;
