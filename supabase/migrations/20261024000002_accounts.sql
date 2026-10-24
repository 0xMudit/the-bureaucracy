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
