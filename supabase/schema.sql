-- Nook database setup.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It is safe to run more than once.

-- Profiles: one row per account, holding the public name and profile customization.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  bio text default '' check (char_length(bio) <= 160),
  avatar_color text default '#5B4A6E',
  accent text default '#E8A33D',
  banner text default '#3B3226',
  layout text default 'favorites' check (layout in ('favorites', 'photos')),
  show_stats boolean default true,
  letterboxd_url text,
  created_at timestamptz default now()
);

-- Posts: both logs/reviews and photo posts.
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('log', 'photo')),
  title text not null,
  medium text not null,
  -- log fields
  status text,
  progress text,
  logged_on date,
  rating numeric(2, 1) check (rating >= 0 and rating <= 5),
  review text check (char_length(review) <= 4000),
  letterboxd_url text,
  spoiler boolean default false,
  -- photo fields
  photos text[] default '{}',
  filter text default 'Raw',
  filter_strength int default 70 check (filter_strength between 0 and 100),
  caption text check (char_length(caption) <= 500),
  created_at timestamptz default now()
);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_title_idx on public.posts (title);

-- Likes: one row per person per post.
create table if not exists public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id bigint not null references public.posts (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- Row level security: anyone can read; people can only change their own things.
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "posts are public" on public.posts;
create policy "posts are public" on public.posts for select using (true);
drop policy if exists "create own posts" on public.posts;
create policy "create own posts" on public.posts for insert with check (auth.uid() = user_id);
drop policy if exists "edit own posts" on public.posts;
create policy "edit own posts" on public.posts for update using (auth.uid() = user_id);
drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts" on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "likes are public" on public.likes;
create policy "likes are public" on public.likes for select using (true);
drop policy if exists "like as yourself" on public.likes;
create policy "like as yourself" on public.likes for insert with check (auth.uid() = user_id);
drop policy if exists "unlike as yourself" on public.likes;
create policy "unlike as yourself" on public.likes for delete using (auth.uid() = user_id);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, avatar_color)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    (array['#5B4A6E','#3F5A3A','#6E4A4A','#4A5A6E','#6E5A3A','#5A3A5A'])[1 + floor(random() * 6)::int]
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Photo storage: a public bucket where each person uploads into their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "photos are public" on storage.objects;
create policy "photos are public" on storage.objects for select using (bucket_id = 'photos');
drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Update 2: title details from catalog search (safe to run more than once)
alter table public.posts add column if not exists title_key text;
alter table public.posts add column if not exists year int;
alter table public.posts add column if not exists creator text;
alter table public.posts add column if not exists poster_url text;
create index if not exists posts_title_key_idx on public.posts (title_key);
