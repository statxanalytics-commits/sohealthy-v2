-- =====================================================================================
-- v1.0.3 signup hardening
--   1) username_available(text) RPC — signup form checks BEFORE creating the auth user
--   2) handle_new_user() made robust (never blocks signup, never violates unique username)
--   3) on_auth_user_created trigger (re)attached — profile row for EVERY new user,
--      including users who sign up via email OTP (previously they got no profile row).
--   4) one-time backfill of profiles for existing users that have none
--
-- Run in Supabase Dashboard → SQL Editor (as postgres). Safe to re-run (idempotent).
-- =====================================================================================

-- 1) Username availability check (callable by anon during signup)
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(coalesce(p_username, '')))
  );
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- 2) Robust profile creator
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), '');
  v_username text := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, ''), '@', 1));
  v_try      int  := 0;
begin
  if v_username = '' then v_username := 'user'; end if;

  -- If taken by ANOTHER user, append a short random suffix (case-insensitive check).
  while exists (select 1 from public.profiles where lower(username) = lower(v_username) and id <> new.id) loop
    v_try := v_try + 1;
    v_username := v_username || '_' || substr(md5(random()::text || new.id::text), 1, 4);
    exit when v_try > 5;
  end loop;

  insert into public.profiles (id, name, username, email, is_premium)
  values (new.id, v_name, v_username, coalesce(new.email, ''), false)
  on conflict (id) do update set
    email    = excluded.email,
    name     = coalesce(nullif(excluded.name, ''), public.profiles.name),
    username = coalesce(nullif(excluded.username, ''), public.profiles.username);
  return new;
exception when others then
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- 3) (Re)attach trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Backfill: existing auth users with no profile row (19 at time of writing)
insert into public.profiles (id, name, username, email, is_premium)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), ''),
  -- unique username: metadata username, else email local-part; suffix with short id if collision
  case
    when not exists (select 1 from public.profiles p2 where lower(p2.username) = lower(coalesce(nullif(trim(u.raw_user_meta_data->>'username'), ''), split_part(u.email,'@',1))))
      then coalesce(nullif(trim(u.raw_user_meta_data->>'username'), ''), split_part(u.email,'@',1))
    else coalesce(nullif(trim(u.raw_user_meta_data->>'username'), ''), split_part(u.email,'@',1)) || '_' || substr(u.id::text, 1, 4)
  end,
  coalesce(u.email, ''),
  false
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
