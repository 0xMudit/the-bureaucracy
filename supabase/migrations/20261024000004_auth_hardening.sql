-- Authentication hardening: keep profiles in step with auth.users, backfill
-- accounts created before the trigger existed, and make the account row easier
-- to audit.

-- 1. Backfill any auth user that has no profile ----------------------------
insert into public.tb_profiles (id, email, display_name, verified_at)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    nullif(left(u.raw_user_meta_data ->> 'display_name', 48), ''),
    nullif(left(split_part(coalesce(u.email, 'reader'), '@', 1), 48), ''),
    'Reader'
  ),
  u.email_confirmed_at
from auth.users u
left join public.tb_profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 2. New users: never insert an empty or over-long byline ------------------
create or replace function public.tb_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tb_profiles (id, email, display_name, verified_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(left(new.raw_user_meta_data ->> 'display_name', 48), ''),
      nullif(left(split_part(coalesce(new.email, 'reader'), '@', 1), 48), ''),
      'Reader'
    ),
    new.email_confirmed_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.tb_handle_new_user() from public, anon, authenticated;

-- 3. Verification timestamp -------------------------------------------------
-- The 00003 trigger only filled a null. A re-verified address (for example
-- after an email change) should move the timestamp forward too.
create or replace function public.tb_sync_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null then
    update public.tb_profiles
    set verified_at = new.email_confirmed_at
    where id = new.id
      and verified_at is distinct from new.email_confirmed_at;
  end if;
  return new;
end;
$$;

revoke all on function public.tb_sync_verified() from public, anon, authenticated;

-- 4. Keep the register's email in step with auth.users ---------------------
create or replace function public.tb_sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.tb_profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists tb_on_auth_user_email_changed on auth.users;
create trigger tb_on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.tb_sync_profile_email();

revoke all on function public.tb_sync_profile_email() from public, anon, authenticated;

-- 5. Profile hygiene --------------------------------------------------------
alter table public.tb_profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.tb_touch_profile()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tb_profiles_touch on public.tb_profiles;
create trigger tb_profiles_touch
  before update on public.tb_profiles
  for each row execute function public.tb_touch_profile();

revoke all on function public.tb_touch_profile() from public, anon, authenticated;

-- New writes must fit the byline rule the UI already enforces. Existing rows
-- are left alone (NOT VALID) so the migration cannot fail on legacy data.
alter table public.tb_profiles drop constraint if exists tb_profiles_display_name_len;
alter table public.tb_profiles
  add constraint tb_profiles_display_name_len
  check (char_length(display_name) between 1 and 48) not valid;

-- 6. Indexes for the account and audit screens -----------------------------
create index if not exists comments_author_idx on public.comments (author_id);
create index if not exists tb_admin_events_actor_idx on public.tb_admin_events (actor_id);
create index if not exists tb_login_events_email_idx on public.tb_login_events (lower(email));
