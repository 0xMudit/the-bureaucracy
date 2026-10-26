-- Premium reads and the entitlement foundation.
--
-- The wire itself stays free. What is sold is the per-article premium pack
-- (deep read, Prelims traps, Mains skeleton) plus the retention features that
-- arrive later. Gating happens in the API, never in the client: the phone
-- bundle is inspectable and the web payload is one devtools tab away.
--
-- Nothing here grants access. A plan is set deliberately (manually today,
-- through a billing webhook later) and `lib/entitlements.ts` is the single
-- place that decides what a plan may read.

-- ---------------------------------------------------------------------------
-- 1. Plans on the existing profile row
-- ---------------------------------------------------------------------------
-- `plan` is the purchased tier; `plan_expires_at` is the end of the paid
-- period. A NULL expiry means an explicitly granted, non-expiring plan (used
-- for the owner account and founding readers). Expiry is evaluated at read
-- time, so a lapsed plan needs no cron to downgrade.
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists plan_expires_at timestamptz;
alter table public.profiles add column if not exists plan_source text;
alter table public.profiles add column if not exists plan_updated_at timestamptz;

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'plus', 'mains'));

create index if not exists profiles_plan_idx on public.profiles (plan);

-- ---------------------------------------------------------------------------
-- 2. Generated premium packs: one row per story per prompt version
-- ---------------------------------------------------------------------------
-- Generation is cached, not per-view: a 2,000-character pack costs a fraction
-- of a rupee, but a provider call on every page view would be both slow and
-- rate-limited. `prompt_version` lets a better prompt generate a new row
-- without destroying the old one; the `items` cascade keeps the table as short
-- lived as the wire.
create table if not exists public.tb_premium_reads (
  id             bigserial primary key,
  item_id        text not null references public.items (id) on delete cascade,
  prompt_version text not null,
  pack           jsonb not null,
  provider       text,
  model          text,
  tokens_in      integer,
  tokens_out     integer,
  cost_usd       numeric(12, 6),
  generated_at   timestamptz not null default now(),
  unique (item_id, prompt_version)
);

create index if not exists tb_premium_reads_item_idx
  on public.tb_premium_reads (item_id, generated_at desc);

-- ---------------------------------------------------------------------------
-- 3. Provider usage log
-- ---------------------------------------------------------------------------
-- Every premium generation writes one row, so a bad prompt cannot quietly burn
-- the tier. `item_id` is intentionally not a foreign key: the wire deletes
-- stories every 24 hours and the cost history has to outlive them.
create table if not exists public.tb_ai_usage (
  id             bigserial primary key,
  kind           text not null check (kind in ('article_intel', 'premium_pack')),
  item_id        text,
  user_id        uuid references public.profiles (id) on delete set null,
  provider       text,
  model          text,
  tokens_in      integer,
  tokens_out     integer,
  cost_usd       numeric(12, 6),
  prompt_version text,
  created_at     timestamptz not null default now()
);

create index if not exists tb_ai_usage_created_idx on public.tb_ai_usage (created_at desc);
create index if not exists tb_ai_usage_kind_idx on public.tb_ai_usage (kind, created_at desc);

-- Service-role only, like every other operational table.
alter table public.tb_premium_reads enable row level security;
alter table public.tb_ai_usage enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Retention: costs and orphaned packs age out with the rest
-- ---------------------------------------------------------------------------
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
  delete from public.tb_ai_usage where created_at < now() - interval '180 days';

  return v_deleted;
end;
$$;

revoke all on function public.tb_prune(timestamptz) from public, anon, authenticated;
grant execute on function public.tb_prune(timestamptz) to service_role;
