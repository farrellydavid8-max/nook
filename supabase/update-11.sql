-- Nook update 11: private accounts and follow requests.
-- Private accounts' posts, comments, lists, Want to lists and game libraries can only be read by
-- the owner and their approved followers. This is enforced by the database itself.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

alter table public.profiles add column if not exists is_private boolean default false;

-- Follows can be waiting for approval
alter table public.follows add column if not exists status text default 'accepted';
alter table public.follows drop constraint if exists follows_status_check;
alter table public.follows add constraint follows_status_check check (status in ('accepted', 'pending'));

-- Who can see someone's things: themselves, anyone if they're public, or approved followers
create or replace function public.can_see(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select owner = auth.uid()
    or not coalesce((select p.is_private from public.profiles p where p.id = owner), false)
    or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = owner and f.status = 'accepted');
$$;

-- Posts and everything attached to them
drop policy if exists "posts are public" on public.posts;
drop policy if exists "posts are visible" on public.posts;
create policy "posts are visible" on public.posts for select using (public.can_see(user_id));

drop policy if exists "comments are public" on public.comments;
drop policy if exists "comments are visible" on public.comments;
create policy "comments are visible" on public.comments for select
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_see(p.user_id)));

drop policy if exists "likes are public" on public.likes;
drop policy if exists "likes are visible" on public.likes;
create policy "likes are visible" on public.likes for select
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_see(p.user_id)));

drop policy if exists "lists are public" on public.lists;
drop policy if exists "lists are visible" on public.lists;
create policy "lists are visible" on public.lists for select using (public.can_see(user_id));

drop policy if exists "list items are public" on public.list_items;
drop policy if exists "list items are visible" on public.list_items;
create policy "list items are visible" on public.list_items for select
  using (exists (select 1 from public.lists l where l.id = list_id and public.can_see(l.user_id)));

drop policy if exists "watchlists are public" on public.watchlist;
drop policy if exists "watchlists are visible" on public.watchlist;
create policy "watchlists are visible" on public.watchlist for select using (public.can_see(user_id));

drop policy if exists "libraries are public" on public.game_library;
drop policy if exists "libraries are visible" on public.game_library;
create policy "libraries are visible" on public.game_library for select using (public.can_see(user_id));

-- New follows of a private account start as requests (set by the database, so it can't be skipped)
create or replace function public.follow_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce((select is_private from public.profiles where id = new.following_id), false) then
    new.status := 'pending';
  else
    new.status := 'accepted';
  end if;
  return new;
end; $$;
drop trigger if exists before_follow on public.follows;
create trigger before_follow before insert on public.follows for each row execute function public.follow_status();

-- The person being followed can approve a request (or remove a follower)
drop policy if exists "approve follow requests" on public.follows;
create policy "approve follow requests" on public.follows for update
  using (auth.uid() = following_id) with check (auth.uid() = following_id and status = 'accepted');
drop policy if exists "unfollow as yourself" on public.follows;
drop policy if exists "unfollow or remove follower" on public.follows;
create policy "unfollow or remove follower" on public.follows for delete
  using (auth.uid() = follower_id or auth.uid() = following_id);

-- Notifications: requests and approvals
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'like', 'comment', 'follow_request', 'follow_accepted'));

create or replace function public.notify_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, case when new.status = 'pending' then 'follow_request' else 'follow' end);
  return new;
end; $$;

create or replace function public.notify_follow_accepted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (user_id, actor_id, type) values (new.follower_id, new.following_id, 'follow_accepted');
    -- The request notification has been dealt with
    delete from public.notifications where user_id = new.following_id and actor_id = new.follower_id and type = 'follow_request';
  end if;
  return new;
end; $$;
drop trigger if exists on_follow_accepted on public.follows;
create trigger on_follow_accepted after update on public.follows for each row execute function public.notify_follow_accepted();

-- Going public approves everyone who was waiting
create or replace function public.on_privacy_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted' where following_id = new.id and status = 'pending';
  end if;
  return new;
end; $$;
drop trigger if exists on_privacy_change on public.profiles;
create trigger on_privacy_change after update of is_private on public.profiles for each row execute function public.on_privacy_change();

notify pgrst, 'reload schema';

-- Let people clear their own notifications
drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications" on public.notifications for delete using (auth.uid() = user_id);
