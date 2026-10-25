-- Phase 4/5: generated article intelligence, image provenance, archive search,
-- admin content controls and push delivery accounting.
--
-- The wire still shows only the previous 24 hours. When a story leaves the
-- wire it is marked `archived_at` rather than deleted, so /archive can search
-- it by date, topic and syllabus paper. A column-based archive keeps comments,
-- reactions and saves attached to the story, which a separate archive table
-- would orphan.

-- ---------------------------------------------------------------------------
-- 1. Generated intelligence on items
-- ---------------------------------------------------------------------------
alter table public.items add column if not exists gs_paper text;
alter table public.items add column if not exists prelims_fact text;
alter table public.items add column if not exists mains_angle text;
alter table public.items add column if not exists syllabus_hint text;
alter table public.items add column if not exists ai_relevance integer;
alter table public.items add column if not exists ai_topic text;
alter table public.items add column if not exists india_relevant boolean not null default true;
alter table public.items add column if not exists ai_provider text;
alter table public.items add column if not exists ai_prompt_version text;
alter table public.items add column if not exists pinned boolean not null default false;
alter table public.items add column if not exists hidden boolean not null default false;
alter table public.items add column if not exists hidden_reason text;
alter table public.items add column if not exists moderated_by uuid references public.profiles (id) on delete set null;

create index if not exists items_archive_search_idx
  on public.items (published_at desc, primary_topic)
  where archived_at is not null;

create index if not exists items_visible_idx
  on public.items (published_at desc, exam_score desc)
  where archived_at is null and hidden = false;

-- ---------------------------------------------------------------------------
-- 2. AI job queue: one row per story, retryable and idempotent
-- ---------------------------------------------------------------------------
alter table public.ai_jobs add column if not exists result jsonb;
alter table public.ai_jobs add column if not exists model text;
alter table public.ai_jobs add column if not exists latency_ms integer;
alter table public.ai_jobs add column if not exists next_attempt_at timestamptz not null default now();
alter table public.ai_jobs add column if not exists locked_at timestamptz;

create index if not exists ai_jobs_queue_idx
  on public.ai_jobs (status, next_attempt_at)
  where status in ('queued', 'failed');

-- ---------------------------------------------------------------------------
-- 3. Push delivery log: the frequency cap is enforced from this table
-- ---------------------------------------------------------------------------
create table if not exists public.push_deliveries (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  endpoint   text,
  status     text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists push_deliveries_user_day_idx
  on public.push_deliveries (user_id, created_at desc);
alter table public.push_deliveries enable row level security;

-- A campaign is an in-app notification kind too.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (kind in (
    'daily_brief', 'streak_at_risk', 'reply', 'comment_like',
    'follow', 'location_alert', 'campaign', 'system'
  ));

-- ---------------------------------------------------------------------------
-- 4. Archive hygiene: keep completed jobs tidy
-- ---------------------------------------------------------------------------
create or replace function public.tb_prune_ai_jobs(days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.ai_jobs
  where status in ('done', 'skipped') and updated_at < now() - make_interval(days => days);
  get diagnostics v_deleted = row_count;
  delete from public.push_deliveries where created_at < now() - interval '45 days';
  return v_deleted;
end;
$$;

revoke all on function public.tb_prune_ai_jobs(integer) from public, anon, authenticated;
grant execute on function public.tb_prune_ai_jobs(integer) to service_role;
