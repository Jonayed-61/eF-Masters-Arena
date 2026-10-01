-- PostgreSQL string functions do not implicitly accept enum values. Cast the
-- fixture status before composing notification titles and audit action names.

create or replace function public.admin_update_fixture_status(
  p_fixture_id uuid,
  p_status public.fixture_status,
  p_match_date date,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_old public.fixtures;
begin
  perform public.assert_admin();
  select * into v_old from public.fixtures where id=p_fixture_id for update;

  if p_status in('RESCHEDULED','RESERVED','SCHEDULED') and p_match_date is null then
    raise exception 'A new date is required';
  end if;

  if p_match_date is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_match_date::text||least(v_old.home_player_id,v_old.away_player_id)::text||greatest(v_old.home_player_id,v_old.away_player_id)::text,0));
    if exists(
      select 1
      from public.reserve_days rd
      where rd.tournament_id=v_old.tournament_id
        and rd.reserve_date=p_match_date
        and rd.active
        and (
          (select count(*) from public.fixtures f where f.id<>p_fixture_id and f.match_date=p_match_date and f.status<>'CANCELLED' and v_old.home_player_id in(f.home_player_id,f.away_player_id))>=rd.max_matches_per_player
          or
          (select count(*) from public.fixtures f where f.id<>p_fixture_id and f.match_date=p_match_date and f.status<>'CANCELLED' and v_old.away_player_id in(f.home_player_id,f.away_player_id))>=rd.max_matches_per_player
        )
    ) then
      raise exception 'Reserve Day capacity reached for one or both players';
    end if;
  end if;

  update public.fixtures
  set status=p_status,match_date=coalesce(p_match_date,match_date)
  where id=p_fixture_id;

  insert into public.notifications(user_id,type,title,message,target_type,target_id)
    select
      player_id,
      'FIXTURE_'||p_status::text,
      'Fixture '||lower(p_status::text),
      p_reason,
      'fixture',
      p_fixture_id
    from public.tournament_players
    where tournament_id=v_old.tournament_id
      and player_id in(v_old.home_player_id,v_old.away_player_id);

  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,old_data,new_data,reason)
  values(
    auth.uid(),
    v_old.tournament_id,
    'FIXTURE_'||p_status::text,
    'fixture',
    p_fixture_id,
    to_jsonb(v_old),
    (select to_jsonb(f) from public.fixtures f where f.id=p_fixture_id),
    p_reason
  );
end;
$$;

revoke all on function public.admin_update_fixture_status(uuid,public.fixture_status,date,text) from public,anon;
grant execute on function public.admin_update_fixture_status(uuid,public.fixture_status,date,text) to authenticated;
