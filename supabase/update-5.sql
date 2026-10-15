-- Nook update 5: invite links.
-- When someone signs up from a friend's invite link, they follow each other automatically.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  inviter uuid;
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

  -- Invited by a friend? Follow each other.
  select id into inviter from public.profiles where username = lower(coalesce(new.raw_user_meta_data ->> 'invited_by', ''));
  if inviter is not null and inviter <> new.id then
    insert into public.follows (follower_id, following_id) values (new.id, inviter) on conflict do nothing;
    insert into public.follows (follower_id, following_id) values (inviter, new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
