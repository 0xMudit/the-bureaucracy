-- Role-based access: the third `admin` role, account suspension, verified-at
-- tracking and an append-only audit trail for every administrative action.

-- 1. Roles ------------------------------------------------------------------
alter table public.tb_profiles drop constraint if exists tb_profiles_role_check;
alter table public.tb_profiles
  add constraint tb_profiles_role_check check (role in ('reader', 'editor', 'admin'));

alter table public.tb_profiles alter column role set default 'reader';

-- 2. Suspension -------------------------------------------------------------
alter table public.tb_profiles add column if not exists status text not null default 'active';
alter table public.tb_profiles drop constraint if exists tb_profiles_status_check;
alter table public.tb_profiles
  add constraint tb_profiles_status_check check (status in ('active', 'suspended'));
alter table public.tb_profiles add column if not exists suspended_at timestamptz;

-- 3. Verification timestamp -------------------------------------------------
alter table public.tb_profiles add column if not exists verified_at timestamptz;

update public.tb_profiles p
set verified_at = u.email_confirmed_at
from auth.users u
where u.id = p.id
  and p.verified_at is null
  and u.email_confirmed_at is not null;

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
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, 'reader'), '@', 1)
    ),
    new.email_confirmed_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.tb_sync_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tb_profiles
  set verified_at = new.email_confirmed_at
  where id = new.id
    and new.email_confirmed_at is not null
    and verified_at is null;
  return new;
end;
$$;

drop trigger if exists tb_on_auth_user_verified on auth.users;
create trigger tb_on_auth_user_verified
  after update of email_confirmed_at on auth.users
  for each row execute function public.tb_sync_verified();

revoke all on function public.tb_sync_verified() from public, anon, authenticated;

-- 4. Administrative audit trail --------------------------------------------
create table if not exists public.tb_admin_events (
  id           bigserial primary key,
  actor_id     uuid references auth.users (id) on delete set null,
  actor_email  text,
  target_id    uuid references auth.users (id) on delete set null,
  target_email text,
  action       text not null,
  detail       text,
  created_at   timestamptz not null default now()
);

create index if not exists tb_admin_events_created_idx on public.tb_admin_events (created_at desc);
create index if not exists tb_admin_events_target_idx on public.tb_admin_events (target_id);

alter table public.tb_admin_events enable row level security;

-- 5. Helpful indexes --------------------------------------------------------
create index if not exists tb_profiles_role_idx on public.tb_profiles (role);
create index if not exists tb_profiles_status_idx on public.tb_profiles (status);
