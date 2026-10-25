-- Social graph, reactions, saves, comments v2, notifications, push, streaks
-- and the operational tables the admin console reads.
--
-- Design notes
-- * The browser still never holds a database key. Every request goes through
--   the server's service role; the RLS policies below are defence in depth for
--   a future direct-client path and for the Supabase dashboard.
-- * `profiles` is the canonical name. The older `tb_profiles` table is renamed
--   in place, preserving ids, foreign keys and the auth trigger.
-- * Reactions use an actor key so signed-out readers keep the anonymous
--   experience while signed-in readers get one reaction per account.

-- ---------------------------------------------------------------------------
-- 1. Profiles
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'tb_profiles'
  ) and not exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles'
  ) then
    alter table public.tb_profiles rename to profiles;
  end if;
end $$;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_config jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists district text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists public_saves boolean not null default true;
alter table public.profiles add column if not exists onboarded_at timestamptz;
alter table public.profiles add column if not exists onboard_skipped_at timestamptz;
alter table public.profiles add column if not exists follower_count integer not null default 0;
alter table public.profiles add column if not exists following_count integer not null default 0;

-- Roles: `reader` becomes `user`; editor/admin are retained because the
-- existing operations console needs a middle role.
update public.profiles set role = 'user' where role = 'reader';
alter table public.profiles alter column role set default 'user';
alter table public.profiles drop constraint if exists tb_profiles_role_check;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'editor', 'admin'));

-- Deterministic, unique usernames. A reader can change this once from the
-- onboarding screen or account settings.
with base as (
  select
    id,
    left(
      trim(both '_' from regexp_replace(lower(split_part(coalesce(nullif(email, ''), 'reader@local'), '@', 1)), '[^a-z0-9_]+', '_', 'g')),
      24
    ) as candidate,
    row_number() over (
      partition by left(
        trim(both '_' from regexp_replace(lower(split_part(coalesce(nullif(email, ''), 'reader@local'), '@', 1)), '[^a-z0-9_]+', '_', 'g')),
        24
      )
      order by created_at, id
    ) as seq
  from public.profiles
  where username is null
)
update public.profiles p
set username = case
  when length(b.candidate) >= 3 and b.seq = 1 then b.candidate
  when length(b.candidate) >= 3 then left(b.candidate, 24) || '_' || b.seq::text
  else 'reader_' || left(replace(p.id::text, '-', ''), 8)
end
from base b
where p.id = b.id;

update public.profiles
set username = 'reader_' || left(replace(id::text, '-', ''), 8)
where username is null or length(username) < 3;

alter table public.profiles alter column username set not null;
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles
  add constraint profiles_username_check check (username ~ '^[a-z0-9_]{3,32}$');
create unique index if not exists profiles_username_key on public.profiles (lower(username));
create index if not exists profiles_followers_idx on public.profiles (follower_count desc);

create or replace function public.tb_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_username text;
  v_suffix integer := 0;
begin
  v_base := left(
    trim(both '_' from regexp_replace(
      lower(split_part(coalesce(nullif(new.email, ''), 'reader@local'), '@', 1)),
      '[^a-z0-9_]+', '_', 'g'
    )),
    24
  );
  if length(v_base) < 3 then
    v_base := 'reader_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  v_username := v_base;
  while exists (select 1 from public.profiles where lower(username) = lower(v_username)) loop
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 24) || '_' || v_suffix::text;
  end loop;

  insert into public.profiles (id, email, display_name, username, verified_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(left(new.raw_user_meta_data ->> 'display_name', 48), ''),
      nullif(left(split_part(coalesce(new.email, 'reader'), '@', 1), 48), ''),
      'Reader'
    ),
    v_username,
    new.email_confirmed_at
  )
  on conflict (id) do nothing;

  insert into public.notification_prefs (user_id) values (new.id)
  on conflict (user_id) do nothing;

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
  if new.email_confirmed_at is not null then
    update public.profiles
    set verified_at = new.email_confirmed_at
    where id = new.id
      and verified_at is distinct from new.email_confirmed_at;
  end if;
  return new;
end;
$$;

create or replace function public.tb_sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.tb_handle_new_user() from public, anon, authenticated;
revoke all on function public.tb_sync_verified() from public, anon, authenticated;
revoke all on function public.tb_sync_profile_email() from public, anon, authenticated;

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Follows
-- ---------------------------------------------------------------------------
create table if not exists public.user_follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx on public.user_follows (following_id, created_at desc);
create index if not exists user_follows_follower_idx on public.user_follows (follower_id, created_at desc);
alter table public.user_follows enable row level security;

create or replace function public.tb_recount_follows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
  end if;
  return null;
end;
$$;

drop trigger if exists user_follows_count on public.user_follows;
create trigger user_follows_count
  after insert or delete on public.user_follows
  for each row execute function public.tb_recount_follows();

-- ---------------------------------------------------------------------------
-- 3. Items: reactions, saves, archive, AI and images
-- ---------------------------------------------------------------------------
alter table public.items add column if not exists like_count integer not null default 0;
alter table public.items add column if not exists dislike_count integer not null default 0;
alter table public.items add column if not exists save_count integer not null default 0;
alter table public.items add column if not exists image_url text;
alter table public.items add column if not exists image_source text;
alter table public.items add column if not exists image_attribution text;
alter table public.items add column if not exists image_checked_at timestamptz;
alter table public.items add column if not exists summary_bullets jsonb not null default '[]'::jsonb;
alter table public.items add column if not exists exam_angle text;
alter table public.items add column if not exists ai_generated_at timestamptz;
alter table public.items add column if not exists ai_model text;
alter table public.items add column if not exists ai_error text;
alter table public.items add column if not exists cluster_id text;
alter table public.items add column if not exists duplicate_of text references public.items (id) on delete set null;
alter table public.items add column if not exists archived_at timestamptz;

create index if not exists items_live_idx on public.items (published_at desc) where archived_at is null;
create index if not exists items_rank_idx on public.items (published_at desc, exam_score desc);
create index if not exists items_cluster_idx on public.items (cluster_id) where cluster_id is not null;
create index if not exists items_archived_idx on public.items (archived_at);
create index if not exists items_topic_live_idx on public.items (primary_topic, published_at desc) where archived_at is null;

create table if not exists public.reactions (
  id         bigserial primary key,
  item_id    text not null references public.items (id) on delete cascade,
  actor_key  text not null check (char_length(actor_key) between 3 and 100),
  user_id    uuid references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, actor_key)
);

create index if not exists reactions_item_kind_idx on public.reactions (item_id, kind);
create index if not exists reactions_user_idx on public.reactions (user_id) where user_id is not null;
alter table public.reactions enable row level security;

create table if not exists public.saves (
  item_id    text not null references public.items (id) on delete cascade,
  actor_key  text not null check (char_length(actor_key) between 3 and 100),
  user_id    uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, actor_key)
);

create index if not exists saves_user_idx on public.saves (user_id, created_at desc) where user_id is not null;
alter table public.saves enable row level security;

-- Preserve every existing upvote as a like. This is a one-time backfill; the
-- legacy table remains for rollback but the UI no longer writes to it.
insert into public.reactions (item_id, actor_key, kind, created_at)
select item_id, 'anon:' || voter_id, 'like', created_at
from public.votes
on conflict (item_id, actor_key) do nothing;

update public.items i
set like_count = (select count(*) from public.reactions r where r.item_id = i.id and r.kind = 'like'),
    dislike_count = (select count(*) from public.reactions r where r.item_id = i.id and r.kind = 'dislike'),
    points = (select count(*) from public.reactions r where r.item_id = i.id and r.kind = 'like');

create or replace function public.tb_recount_reactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item text := coalesce(new.item_id, old.item_id);
  v_likes integer;
  v_dislikes integer;
begin
  select count(*) filter (where kind = 'like'), count(*) filter (where kind = 'dislike')
  into v_likes, v_dislikes
  from public.reactions where item_id = v_item;

  update public.items
  set like_count = v_likes,
      dislike_count = v_dislikes,
      points = v_likes
  where id = v_item;

  return null;
end;
$$;

drop trigger if exists reactions_count on public.reactions;
create trigger reactions_count
  after insert or update or delete on public.reactions
  for each row execute function public.tb_recount_reactions();

create or replace function public.tb_recount_saves()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item text := coalesce(new.item_id, old.item_id);
begin
  update public.items
  set save_count = (select count(*) from public.saves where item_id = v_item)
  where id = v_item;
  return null;
end;
$$;

drop trigger if exists saves_count on public.saves;
create trigger saves_count
  after insert or delete on public.saves
  for each row execute function public.tb_recount_saves();

-- One atomic toggle for the Like / Dislike pair.
create or replace function public.tb_react(
  p_item_id text,
  p_actor_key text,
  p_user_id uuid,
  p_kind text
)
returns table (likes integer, dislikes integer, my_reaction text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  if p_kind not in ('like', 'dislike') then
    raise exception 'invalid_reaction' using errcode = '22023';
  end if;
  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  select kind into v_current
  from public.reactions
  where item_id = p_item_id and actor_key = p_actor_key
  for update;

  if v_current = p_kind then
    delete from public.reactions where item_id = p_item_id and actor_key = p_actor_key;
  elsif v_current is null then
    insert into public.reactions (item_id, actor_key, user_id, kind)
    values (p_item_id, p_actor_key, p_user_id, p_kind);
  else
    update public.reactions
    set kind = p_kind, updated_at = now()
    where item_id = p_item_id and actor_key = p_actor_key;
  end if;

  return query
  select
    count(*) filter (where kind = 'like')::integer,
    count(*) filter (where kind = 'dislike')::integer,
    (select kind from public.reactions where item_id = p_item_id and actor_key = p_actor_key)
  from public.reactions
  where item_id = p_item_id;
end;
$$;

revoke all on function public.tb_react(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.tb_react(text, text, uuid, text) to service_role;

-- A compatibility bridge for older mobile clients. The vote endpoint now
-- records a like; tapping it again removes the like.
create or replace function public.tb_vote(p_item_id text, p_voter_id text)
returns table (points integer, voted boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.tb_react(p_item_id, 'anon:' || p_voter_id, null, 'like');
  return query
  select i.like_count, exists (
    select 1 from public.reactions r
    where r.item_id = p_item_id and r.actor_key = 'anon:' || p_voter_id
  )
  from public.items i where i.id = p_item_id;
end;
$$;

revoke all on function public.tb_vote(text, text) from public, anon, authenticated;
grant execute on function public.tb_vote(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Comments v2: edit, soft delete, likes
-- ---------------------------------------------------------------------------
alter table public.comments add column if not exists edited_at timestamptz;
alter table public.comments add column if not exists deleted_at timestamptz;
alter table public.comments add column if not exists like_count integer not null default 0;

create index if not exists comments_thread_idx on public.comments (item_id, parent_id, created_at)
  where hidden_at is null and deleted_at is null;

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  actor_key  text not null check (char_length(actor_key) between 3 and 100),
  user_id    uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, actor_key)
);

create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);
alter table public.comment_likes enable row level security;

create or replace function public.tb_recount_comment_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.comments
  set like_count = (select count(*) from public.comment_likes where comment_id = v_comment)
  where id = v_comment;
  return null;
end;
$$;

drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
  after insert or delete on public.comment_likes
  for each row execute function public.tb_recount_comment_likes();

create or replace function public.tb_toggle_comment_like(
  p_comment_id uuid,
  p_actor_key text,
  p_user_id uuid
)
returns table (likes integer, liked boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.comment_likes where comment_id = p_comment_id and actor_key = p_actor_key
  ) then
    delete from public.comment_likes where comment_id = p_comment_id and actor_key = p_actor_key;
  else
    insert into public.comment_likes (comment_id, actor_key, user_id)
    values (p_comment_id, p_actor_key, p_user_id);
  end if;

  return query
  select
    (select count(*)::integer from public.comment_likes where comment_id = p_comment_id),
    exists (select 1 from public.comment_likes where comment_id = p_comment_id and actor_key = p_actor_key);
end;
$$;

revoke all on function public.tb_toggle_comment_like(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.tb_toggle_comment_like(uuid, text, uuid) to service_role;

-- A reply may only be one level deep. The UI enforces it, and this trigger
-- protects the data even if a future client forgets.
create or replace function public.tb_comment_depth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is not null and exists (
    select 1 from public.comments where id = new.parent_id and parent_id is not null
  ) then
    raise exception 'reply_depth_exceeded' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_depth on public.comments;
create trigger comments_depth
  before insert or update of parent_id on public.comments
  for each row execute function public.tb_comment_depth();

-- ---------------------------------------------------------------------------
-- 5. Notifications, preferences, push and streaks
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in (
               'daily_brief', 'streak_at_risk', 'reply', 'comment_like',
               'follow', 'location_alert', 'system'
             )),
  title      text not null,
  body       text not null default '',
  url        text not null default '/',
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

create table if not exists public.notification_prefs (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  daily_brief    boolean not null default true,
  streak_at_risk boolean not null default true,
  replies        boolean not null default true,
  comment_likes  boolean not null default true,
  follows        boolean not null default true,
  location_alerts boolean not null default false,
  quiet_start    time not null default '22:30',
  quiet_end      time not null default '07:00',
  timezone       text not null default 'Asia/Kolkata',
  max_per_day    integer not null default 2 check (max_per_day between 0 and 2),
  updated_at     timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create table if not exists public.streaks (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  current_count  integer not null default 0 check (current_count >= 0),
  longest_count  integer not null default 0 check (longest_count >= 0),
  last_read_date date,
  freezes        integer not null default 0 check (freezes >= 0),
  updated_at     timestamptz not null default now()
);

alter table public.streaks enable row level security;

create or replace function public.tb_touch_streak(p_user_id uuid, p_day date)
returns table (current_count integer, longest_count integer, last_read_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_longest integer;
  v_last date;
begin
  insert into public.streaks (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  select s.current_count, s.longest_count, s.last_read_date
  into v_current, v_longest, v_last
  from public.streaks s where s.user_id = p_user_id
  for update;

  if v_last is distinct from p_day then
    if v_last = p_day - 1 then
      v_current := v_current + 1;
    else
      v_current := 1;
    end if;
    v_longest := greatest(v_longest, v_current);
    update public.streaks
    set current_count = v_current,
        longest_count = v_longest,
        last_read_date = p_day,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  return query select v_current, v_longest, p_day;
end;
$$;

revoke all on function public.tb_touch_streak(uuid, date) from public, anon, authenticated;
grant execute on function public.tb_touch_streak(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Reports (generic), campaigns and operations
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('item', 'comment', 'profile')),
  target_id    text not null,
  reporter_id  uuid references public.profiles (id) on delete set null,
  reporter_key text not null,
  reason       text not null check (reason in ('spam', 'abuse', 'off-topic', 'misinformation', 'other')),
  detail       text check (char_length(detail) <= 300),
  status       text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles (id) on delete set null
);

create unique index if not exists reports_once_idx on public.reports (target_type, target_id, reporter_key);
create index if not exists reports_open_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;

create table if not exists public.notification_campaigns (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  url           text not null default '/',
  audience      text not null default 'all' check (audience in ('all', 'brief', 'followers')),
  scheduled_for timestamptz,
  status        text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'cancelled')),
  sent_at       timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.notification_campaigns enable row level security;

create table if not exists public.ingest_runs (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running' check (status in ('running', 'ok', 'partial', 'failed')),
  fetched     integer not null default 0,
  kept        integer not null default 0,
  inserted    integer not null default 0,
  updated     integer not null default 0,
  errors      jsonb not null default '[]'::jsonb
);

alter table public.ingest_runs enable row level security;

create table if not exists public.source_health (
  source        text primary key,
  source_url    text,
  tier          text,
  last_fetch_at timestamptz,
  last_ok_at    timestamptz,
  failures      integer not null default 0,
  last_error    text,
  items_24h     integer not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.source_health enable row level security;

create table if not exists public.ai_jobs (
  id          uuid primary key default gen_random_uuid(),
  item_id     text not null references public.items (id) on delete cascade,
  status      text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'skipped')),
  provider    text,
  attempts    integer not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (item_id)
);

create index if not exists ai_jobs_status_idx on public.ai_jobs (status, created_at);
alter table public.ai_jobs enable row level security;

-- ---------------------------------------------------------------------------
-- 7. RLS policies (defence in depth)
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- A self-referencing subquery in a profiles policy recurses under RLS. This
-- security-definer helper reads only the caller's own role and is safe to
-- expose to authenticated clients.
create or replace function public.tb_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

revoke all on function public.tb_current_role() from public, anon;
grant execute on function public.tb_current_role() to authenticated;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = public.tb_current_role());

drop policy if exists follows_read on public.user_follows;
create policy follows_read on public.user_follows for select to authenticated using (true);
drop policy if exists follows_own on public.user_follows;
create policy follows_own on public.user_follows for all to authenticated
  using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));

drop policy if exists reactions_read on public.reactions;
create policy reactions_read on public.reactions for select to authenticated using (true);
drop policy if exists reactions_own on public.reactions;
create policy reactions_own on public.reactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists saves_own on public.saves;
create policy saves_own on public.saves for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists comment_likes_read on public.comment_likes;
create policy comment_likes_read on public.comment_likes for select to authenticated using (true);
drop policy if exists comment_likes_own on public.comment_likes;
create policy comment_likes_own on public.comment_likes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists prefs_own on public.notification_prefs;
create policy prefs_own on public.notification_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists streaks_own on public.streaks;
create policy streaks_own on public.streaks for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 8. Archive rather than delete
-- ---------------------------------------------------------------------------
create or replace function public.tb_prune(cutoff timestamptz default now() - interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived integer;
begin
  update public.items
  set archived_at = coalesce(archived_at, now())
  where published_at < cutoff and archived_at is null;
  get diagnostics v_archived = row_count;

  delete from public.tb_visits where created_at < now() - interval '90 days';
  delete from public.tb_login_events where created_at < now() - interval '180 days';
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.comment_reports where status <> 'open' and resolved_at < now() - interval '180 days';
  delete from public.reports where status <> 'open' and resolved_at < now() - interval '180 days';

  return v_archived;
end;
$$;

revoke all on function public.tb_prune(timestamptz) from public, anon, authenticated;
grant execute on function public.tb_prune(timestamptz) to service_role;

-- Keep the existing profile hygiene trigger name working after the rename.
drop trigger if exists tb_profiles_touch on public.profiles;
create trigger tb_profiles_touch
  before update on public.profiles
  for each row execute function public.tb_touch_profile();
