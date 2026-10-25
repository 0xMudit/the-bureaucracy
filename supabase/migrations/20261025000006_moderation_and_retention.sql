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
