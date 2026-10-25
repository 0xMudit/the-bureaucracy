-- The Bureaucracy - Supabase schema (single-file snapshot)
--
-- GENERATED FILE. Do not edit by hand.
-- Run \`npm run db:snapshot\` after adding a migration; this file is the
-- migrations concatenated in filename order and is equivalent to applying
-- them one by one.
--
-- SOURCE OF TRUTH: supabase/migrations/*.sql.
--
-- Fresh project:  npx supabase db push      (recommended - applies migrations)
-- SQL editor:     paste this file once.
--
-- All access goes through the service role on the server; the browser never
-- talks to these tables.

-- ===========================================================================
-- 20261024000000_init.sql
-- ===========================================================================

-- The Bureaucracy · Supabase schema
-- Run once in the SQL editor (or `supabase db push`). All access goes through
-- the service role on the server; the browser never talks to these tables.

create extension if not exists pgcrypto;

create table if not exists public.items (
  id               text primary key,
  title            text not null,
  kicker           text not null default '',
  url              text not null unique,
  source           text not null,
  source_url       text not null default '',
  source_tier      text not null default 'news'
                     check (source_tier in ('official', 'news', 'analysis', 'aggregator')),
  summary          text not null default '',
  published_at     timestamptz not null,
  fetched_at       timestamptz not null default now(),
  topics           text[] not null default '{}',
  primary_topic    text,
  exam_score       integer not null default 0 check (exam_score between 0 and 100),
  priority         text not null default 'low' check (priority in ('high', 'medium', 'low')),
  keywords         text[] not null default '{}',
  optionals        text[] not null default '{}',
  primary_optional text,
  points           integer not null default 0 check (points >= 0),
  seed_points      integer not null default 0 check (seed_points >= 0),
  comment_count    integer not null default 0 check (comment_count >= 0)
);

-- Safe upgrades for a database created by an earlier revision.
alter table public.items add column if not exists optionals text[] not null default '{}';
alter table public.items add column if not exists primary_optional text;

create index if not exists items_published_at_idx on public.items (published_at desc);
create index if not exists items_exam_score_idx on public.items (exam_score desc);
create index if not exists items_topics_idx on public.items using gin (topics);
create index if not exists items_optionals_idx on public.items using gin (optionals);

create table if not exists public.votes (
  item_id   text not null references public.items (id) on delete cascade,
  voter_id  text not null,
  created_at timestamptz not null default now(),
  primary key (item_id, voter_id)
);

create index if not exists votes_voter_idx on public.votes (voter_id);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  item_id     text not null references public.items (id) on delete cascade,
  parent_id   uuid references public.comments (id) on delete cascade,
  author      text not null check (char_length(author) between 2 and 32),
  body        text not null check (char_length(body) between 3 and 1500),
  created_at  timestamptz not null default now()
);

create index if not exists comments_item_idx on public.comments (item_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- ---------------------------------------------------------------------------
-- RLS: the browser is never trusted with a database key. The service role
-- bypasses RLS, so no policies are needed for the server-side app.
-- ---------------------------------------------------------------------------
alter table public.items enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;

-- Toggle a vote and return the new community point total. Idempotent per voter.
create or replace function public.tb_vote(p_item_id text, p_voter_id text)
returns table (points integer, voted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voted boolean;
begin
  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  select exists(
    select 1 from public.votes where item_id = p_item_id and voter_id = p_voter_id
  ) into v_voted;

  if v_voted then
    delete from public.votes where item_id = p_item_id and voter_id = p_voter_id;
    update public.items set points = greatest(0, points - 1) where id = p_item_id;
    v_voted := false;
  else
    insert into public.votes (item_id, voter_id)
    values (p_item_id, p_voter_id)
    on conflict do nothing;
    update public.items set points = points + 1 where id = p_item_id;
    v_voted := true;
  end if;

  return query
    select i.points, v_voted from public.items i where i.id = p_item_id;
end;
$$;

-- Insert a comment, validate the parent, and keep the counter in one place.
create or replace function public.tb_add_comment(
  p_item_id text,
  p_parent_id uuid,
  p_author text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_author text := btrim(p_author);
  v_body text := btrim(p_body);
begin
  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;
  if char_length(v_author) < 2 or char_length(v_author) > 32 then
    raise exception 'invalid_author' using errcode = '22023';
  end if;
  if char_length(v_body) < 3 or char_length(v_body) > 1500 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  if p_parent_id is not null and not exists(
    select 1 from public.comments where id = p_parent_id and item_id = p_item_id
  ) then
    raise exception 'invalid_parent' using errcode = '22023';
  end if;

  insert into public.comments (item_id, parent_id, author, body)
  values (p_item_id, p_parent_id, v_author, v_body)
  returning id into v_id;

  update public.items
  set comment_count = comment_count + 1
  where id = p_item_id;

  return v_id;
end;
$$;

-- Only the server (service role) may call these helpers.
revoke all on function public.tb_vote(text, text) from public, anon, authenticated;
revoke all on function public.tb_add_comment(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.tb_vote(text, text) to service_role;
grant execute on function public.tb_add_comment(text, uuid, text, text) to service_role;

-- Optional housekeeping. The ingest endpoint already prunes; this is a manual
-- kill switch you can run from the SQL editor.
create or replace function public.tb_prune(cutoff timestamptz default now() - interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.items where published_at < cutoff;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.tb_prune(timestamptz) from public, anon, authenticated;
grant execute on function public.tb_prune(timestamptz) to service_role;

-- ===========================================================================
-- 20261024000001_fix_tb_vote.sql
-- ===========================================================================

-- Fix: `points` inside tb_vote was ambiguous between the OUT parameter of the
-- same name and public.items.points, so every vote raised 42702.
-- Qualify the column references with the table alias.

create or replace function public.tb_vote(p_item_id text, p_voter_id text)
returns table (points integer, voted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voted boolean;
begin
  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  select exists(
    select 1 from public.votes where item_id = p_item_id and voter_id = p_voter_id
  ) into v_voted;

  if v_voted then
    delete from public.votes where item_id = p_item_id and voter_id = p_voter_id;
    update public.items as i set points = greatest(0, i.points - 1) where i.id = p_item_id;
    v_voted := false;
  else
    insert into public.votes (item_id, voter_id)
    values (p_item_id, p_voter_id)
    on conflict do nothing;
    update public.items as i set points = i.points + 1 where i.id = p_item_id;
    v_voted := true;
  end if;

  return query
    select i.points, v_voted from public.items i where i.id = p_item_id;
end;
$$;

revoke all on function public.tb_vote(text, text) from public, anon, authenticated;
grant execute on function public.tb_vote(text, text) to service_role;

-- ===========================================================================
-- 20261024000002_accounts.sql
-- ===========================================================================

-- Accounts, editor roles, visit analytics and login events.
-- Everything is read/written through the service role on the server; the
-- browser never holds a database key.

create table if not exists public.tb_profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text not null default 'Reader',
  role          text not null default 'reader' check (role in ('reader', 'editor')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

create unique index if not exists tb_profiles_email_key on public.tb_profiles (lower(email));

create table if not exists public.tb_visits (
  id          bigserial primary key,
  path        text not null,
  referrer    text,
  visitor_id  text,
  user_id     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists tb_visits_created_idx on public.tb_visits (created_at desc);
create index if not exists tb_visits_path_idx on public.tb_visits (path);

create table if not exists public.tb_login_events (
  id          bigserial primary key,
  user_id     uuid references auth.users (id) on delete set null,
  email       text,
  kind        text not null check (kind in ('signup', 'login', 'logout')),
  created_at  timestamptz not null default now()
);

create index if not exists tb_login_events_created_idx on public.tb_login_events (created_at desc);

alter table public.comments add column if not exists author_id uuid references auth.users (id) on delete set null;

alter table public.tb_profiles enable row level security;
alter table public.tb_visits enable row level security;
alter table public.tb_login_events enable row level security;

-- Every auth user gets a profile, whichever path created it.
create or replace function public.tb_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tb_profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, 'reader'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists tb_on_auth_user_created on auth.users;
create trigger tb_on_auth_user_created
  after insert on auth.users
  for each row execute function public.tb_handle_new_user();

revoke all on function public.tb_handle_new_user() from public, anon, authenticated;

-- Comments now carry the account that wrote them.
drop function if exists public.tb_add_comment(text, uuid, text, text);

create or replace function public.tb_add_comment(
  p_item_id text,
  p_parent_id uuid,
  p_author text,
  p_body text,
  p_author_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_author text := btrim(p_author);
  v_body text := btrim(p_body);
begin
  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;
  if char_length(v_author) < 2 or char_length(v_author) > 32 then
    raise exception 'invalid_author' using errcode = '22023';
  end if;
  if char_length(v_body) < 3 or char_length(v_body) > 1500 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  if p_parent_id is not null and not exists(
    select 1 from public.comments where id = p_parent_id and item_id = p_item_id
  ) then
    raise exception 'invalid_parent' using errcode = '22023';
  end if;

  insert into public.comments (item_id, parent_id, author, body, author_id)
  values (p_item_id, p_parent_id, v_author, v_body, p_author_id)
  returning id into v_id;

  update public.items
  set comment_count = comment_count + 1
  where id = p_item_id;

  return v_id;
end;
$$;

revoke all on function public.tb_add_comment(text, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.tb_add_comment(text, uuid, text, text, uuid) to service_role;

-- ===========================================================================
-- 20261024000003_roles_admin.sql
-- ===========================================================================

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

-- ===========================================================================
-- 20261024000004_auth_hardening.sql
-- ===========================================================================

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

-- ===========================================================================
-- 20261024000005_rate_limit_and_vote_atomicity.sql
-- ===========================================================================

-- P0 hardening for a shared backend (web + mobile).
--
-- 1. A Postgres-backed fixed-window rate limiter. The previous limiter lived in
--    module memory, so every serverless instance had its own counters and a
--    burst could exceed the limit by the number of warm instances.
-- 2. `tb_vote` had a read-modify-write race: two concurrent toggles could both
--    see "not voted", both insert (one conflicting), and both increment, so a
--    single vote could add two points. Votes now serialize on the story row and
--    the counter is recomputed from the votes table, which is self-healing.
-- 3. The feed indexes from 20261024000000 already cover the hot queries; the
--    only missing one was a covering index for "my votes" lookups plus the
--    limiter's housekeeping index.

-- ---------------------------------------------------------------------------
-- 1. Rate limits
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);

alter table public.rate_limits enable row level security;

-- Used by the probabilistic cleanup inside tb_rate_limit().
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- Atomic fixed-window limiter: one statement per check, so concurrent requests
-- on different instances share the same counter. Returns the remaining wait in
-- whole seconds, which is what the UI shows.
create or replace function public.tb_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
returns table (ok boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now    timestamptz := clock_timestamp();
  v_window interval    := make_interval(
    secs => (greatest(p_window_ms, 1000)::double precision) / 1000.0
  );
  v_hits   integer;
  v_start  timestamptz;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set hits = case
                 when rl.window_start <= v_now - v_window then 1
                 else rl.hits + 1
               end,
        window_start = case
                         when rl.window_start <= v_now - v_window then v_now
                         else rl.window_start
                       end
  returning rl.hits, rl.window_start into v_hits, v_start;

  -- Keep the table at roughly the size of the active key set without a cron.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < v_now - interval '1 day';
  end if;

  return query
    select
      v_hits <= p_limit,
      greatest(0, ceil(extract(epoch from (v_start + v_window - v_now))))::integer;
end;
$$;

revoke all on function public.tb_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.tb_rate_limit(text, integer, integer) to service_role;
grant select, insert, update, delete on public.rate_limits to service_role;

-- ---------------------------------------------------------------------------
-- 2. Atomic vote toggle
-- ---------------------------------------------------------------------------
create or replace function public.tb_vote(p_item_id text, p_voter_id text)
returns table (points integer, voted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed integer;
  v_points  integer;
begin
  -- Serialize every toggle on the same story. Without this lock two instances
  -- can interleave the delete/insert and the counter update.
  perform 1 from public.items where id = p_item_id for update;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  delete from public.votes
  where item_id = p_item_id and voter_id = p_voter_id;
  get diagnostics v_removed = row_count;

  if v_removed = 0 then
    insert into public.votes (item_id, voter_id)
    values (p_item_id, p_voter_id)
    on conflict (item_id, voter_id) do nothing;
  end if;

  -- Recompute instead of incrementing: same result under the lock, and it
  -- repairs any drift introduced by the old race.
  update public.items as i
  set points = (
    select count(*)::integer from public.votes v where v.item_id = p_item_id
  )
  where i.id = p_item_id
  returning i.points into v_points;

  return query select v_points, v_removed = 0;
end;
$$;

revoke all on function public.tb_vote(text, text) from public, anon, authenticated;
grant execute on function public.tb_vote(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
-- "My votes" reads voter_id and projects item_id; make it index-only.
create index if not exists votes_voter_item_idx on public.votes (voter_id, item_id);
drop index if exists public.votes_voter_idx;

-- Comment threads are read per story ordered by time; the existing
-- comments_item_idx (item_id, created_at) already covers it, so nothing to add.

-- Existing indexes kept for reference (all present since 20261024000000):
--   items_published_at_idx  -> feed window + order
--   items_exam_score_idx    -> ranked fallback
--   votes primary key       -> vote lookup / toggle
--   comments_item_idx       -> thread read

-- ===========================================================================
-- 20261025000006_moderation_and_retention.sql
-- ===========================================================================

-- Comment moderation and telemetry retention.
--
-- The wire deletes itself after 24 hours, but comments were still an
-- unmoderated public surface: no report path, no way for an editor to remove a
-- defamatory or spam comment, and no record of who did it. This adds:
--   1. a report queue that any reader can file (account optional),
--   2. hide / restore / delete with an atomic recount of the story's counter,
--   3. retention for visits, login events and limiter rows, so the free-tier
--      database does not grow forever.

-- ---------------------------------------------------------------------------
-- 1. Moderation state on comments
-- ---------------------------------------------------------------------------
alter table public.comments add column if not exists hidden_at     timestamptz;
alter table public.comments add column if not exists hidden_by     uuid references auth.users (id) on delete set null;
alter table public.comments add column if not exists hidden_reason text;

-- The public read path is "visible comments for this story, oldest first".
create index if not exists comments_visible_idx
  on public.comments (item_id, created_at)
  where hidden_at is null;

create table if not exists public.comment_reports (
  id           uuid primary key default gen_random_uuid(),
  comment_id   uuid not null references public.comments (id) on delete cascade,
  reporter_id  uuid references auth.users (id) on delete set null,
  -- Hashed address or device id for anonymous reports. Never a raw IP.
  reporter_key text not null,
  reason       text not null check (reason in ('spam', 'abuse', 'off-topic', 'other')),
  detail       text check (char_length(detail) <= 300),
  status       text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users (id) on delete set null
);

-- One report per person per comment; re-reporting is a no-op, not a way to
-- amplify a complaint.
create unique index if not exists comment_reports_once_idx
  on public.comment_reports (comment_id, reporter_key);
create index if not exists comment_reports_open_idx
  on public.comment_reports (status, created_at desc);

alter table public.comment_reports enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Hide / restore / delete, with a recount
-- ---------------------------------------------------------------------------
create or replace function public.tb_moderate_comment(
  p_comment_id uuid,
  p_action     text,
  p_actor      uuid default null,
  p_reason     text default null
)
returns table (item_id text, visible_comments integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item  text;
  v_author uuid;
  v_action text := lower(coalesce(p_action, ''));
  v_count integer;
begin
  select c.item_id, c.author_id into v_item, v_author
  from public.comments c
  where c.id = p_comment_id
  for update;

  if v_item is null then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;

  if v_action = 'hide' then
    update public.comments
    set hidden_at = coalesce(hidden_at, now()),
        hidden_by = p_actor,
        hidden_reason = left(coalesce(p_reason, ''), 300)
    where id = p_comment_id;

    update public.comment_reports
    set status = 'actioned', resolved_at = now(), resolved_by = p_actor
    where comment_id = p_comment_id and status = 'open';
  elsif v_action = 'restore' then
    update public.comments
    set hidden_at = null, hidden_by = null, hidden_reason = null
    where id = p_comment_id;

    update public.comment_reports
    set status = 'dismissed', resolved_at = now(), resolved_by = p_actor
    where comment_id = p_comment_id and status = 'open';
  elsif v_action = 'delete' then
    -- Replies cascade. The UI warns before this is offered.
    delete from public.comments where id = p_comment_id;
  else
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  select count(*)::integer into v_count
  from public.comments
  where item_id = v_item and hidden_at is null;

  update public.items set comment_count = v_count where id = v_item;

  -- Keep the author reference so the audit log stays FK-valid.
  return query select v_item, v_count;
end;
$$;

revoke all on function public.tb_moderate_comment(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.tb_moderate_comment(uuid, text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Retention
-- ---------------------------------------------------------------------------
-- Visits and login events are operational telemetry, not content. Ninety days
-- is enough to see a trend; anything older is a liability.
create or replace function public.tb_prune(cutoff timestamptz default now() - interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.items where published_at < cutoff;
  get diagnostics v_deleted = row_count;

  delete from public.tb_visits where created_at < now() - interval '90 days';
  delete from public.tb_login_events where created_at < now() - interval '180 days';
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.comment_reports where status <> 'open' and resolved_at < now() - interval '180 days';

  return v_deleted;
end;
$$;

revoke all on function public.tb_prune(timestamptz) from public, anon, authenticated;
grant execute on function public.tb_prune(timestamptz) to service_role;
