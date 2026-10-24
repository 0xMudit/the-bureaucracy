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
