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
    -- Alias the table: a bare `points` here is ambiguous with the OUT parameter.
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
