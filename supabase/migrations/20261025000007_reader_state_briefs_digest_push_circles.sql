-- Reader accounts, the frozen daily brief, the email digest, push tokens and
-- study circles.
--
-- The wire is deliberately ephemeral (24 hours), and until now so was the
-- reader: progress, saves and streaks lived in localStorage, so a reinstall
-- erased months of habit. This migration gives an *optional* account a durable
-- copy, and freezes each day's brief so it can outlive the wire and be indexed.
--
-- RLS is enabled with no policies on every table: the browser and the native
-- app never touch these directly. All reads and writes go through the
-- `/api/mobile/*` and `/api/daily` routes, which verify a Supabase access token
-- (or the cron secret) and use the service role.

-- ---------------------------------------------------------------------------
-- 1. Reader state: progress + saves, one row per account
-- ---------------------------------------------------------------------------
create table if not exists public.tb_reader_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- { version, days, joinedAt, visits, lastVisit, topics, quiz, briefsCompleted }
  progress   jsonb not null default '{}'::jsonb,
  -- SavedItem[] (same shape as lib/saved.ts, capped server-side)
  saves      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tb_reader_state enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Frozen briefs: the indexable, permanent version of each day's five
-- ---------------------------------------------------------------------------
create table if not exists public.tb_briefs (
  day        date primary key,
  -- BriefEntry[] plus the publisher url, frozen at first sight each day.
  entries    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tb_briefs enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Email digest (double opt-in)
-- ---------------------------------------------------------------------------
create table if not exists public.tb_subscribers (
  id              uuid primary key default gen_random_uuid(),
  -- Stored lowercased so the unique constraint is case-insensitive.
  email           text not null unique,
  user_id         uuid references auth.users (id) on delete set null,
  -- The desk the digest should be built for: { exam, stage, optional }.
  desk            jsonb,
  -- Unguessable confirm/unsubscribe capability. Never exposed in a listing.
  token           text not null unique,
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  last_sent_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists tb_subscribers_send_idx
  on public.tb_subscribers (confirmed_at)
  where confirmed_at is not null and unsubscribed_at is null;

alter table public.tb_subscribers enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Expo push tokens
-- ---------------------------------------------------------------------------
create table if not exists public.tb_push_tokens (
  token       text primary key,
  user_id     uuid references auth.users (id) on delete set null,
  device_id   text,
  platform    text check (platform in ('ios', 'android', 'web', 'unknown')),
  desk        jsonb,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists tb_push_tokens_user_idx on public.tb_push_tokens (user_id);
create index if not exists tb_push_tokens_live_idx on public.tb_push_tokens (enabled) where enabled;

alter table public.tb_push_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- 5. Study circles: a small accountability group with one invite code
-- ---------------------------------------------------------------------------
create table if not exists public.tb_circles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.tb_circle_members (
  circle_id uuid not null references public.tb_circles (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  -- Display name captured at join time. Avoids reading auth.users on every
  -- render and lets a reader choose what their friends see.
  name      text check (char_length(name) <= 40),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index if not exists tb_circle_members_user_idx on public.tb_circle_members (user_id);

alter table public.tb_circles enable row level security;
alter table public.tb_circle_members enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Housekeeping
-- ---------------------------------------------------------------------------
-- Expired push tokens are the only unbounded row source here: one per install.
-- The daily job disables tokens Expo reports as unregistered, and this removes
-- the ones that have been dark for a quarter.
create or replace function public.tb_prune_reader_state(cutoff timestamptz default now() - interval '90 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tokens integer;
begin
  delete from public.tb_push_tokens
  where last_seen < cutoff;
  get diagnostics v_tokens = row_count;
  return v_tokens;
end;
$$;

revoke all on function public.tb_prune_reader_state(timestamptz) from public, anon, authenticated;
grant execute on function public.tb_prune_reader_state(timestamptz) to service_role;
