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
