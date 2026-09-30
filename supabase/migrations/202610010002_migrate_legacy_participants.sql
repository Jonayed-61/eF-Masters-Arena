-- Carry Auth-linked profiles, the real tournament, and memberships into the
-- clean schema. No fixtures, results, statistics, penalties, or dates other
-- than the allowed activation date are fabricated.

do $$
declare
  v_legacy_tournament_id uuid;
begin
  if to_regclass('legacy_20260930.profiles') is null then
    return;
  end if;

  if exists (select 1 from legacy_20260930.fixtures) then
    raise exception 'Legacy fixtures appeared after preflight. Reconcile them before migration.';
  end if;

  insert into public.profiles (id,email,username,team_name,avatar_url,role,status,created_at,updated_at)
  select
    lp.id,
    coalesce(au.email,lp.email),
    lp.username,
    lt.team_name,
    lp.profile_image,
    case when lower(lp.role::text)='admin' then 'ADMIN'::public.user_role else 'PLAYER'::public.user_role end,
    case when lower(lp.status::text)='active' then 'ACTIVE'::public.profile_status else 'INACTIVE'::public.profile_status end,
    lp.created_at,
    lp.updated_at
  from legacy_20260930.profiles lp
  join auth.users au on au.id=lp.id
  left join legacy_20260930.teams lt on lt.user_id=lp.id
  where coalesce(au.email,lp.email) is not null
  on conflict(id) do update set
    username=excluded.username,
    team_name=excluded.team_name,
    avatar_url=excluded.avatar_url,
    role=excluded.role,
    status=excluded.status;

  select id into v_legacy_tournament_id
  from legacy_20260930.seasons
  where name='eF Masters Pro League 0'
  order by created_at
  limit 1;

  if v_legacy_tournament_id is null then
    raise exception 'eF Masters Pro League 0 was not found in the archived schema.';
  end if;

  insert into public.tournaments (id,name,organizer,status,start_date,end_date,current_matchweek,created_at,updated_at)
  select
    s.id,
    s.name,
    'eF Masters Arena',
    'ACTIVE'::public.tournament_status,
    coalesce(s.start_date,current_date),
    s.end_date,
    0,
    s.created_at,
    s.updated_at
  from legacy_20260930.seasons s
  where s.id=v_legacy_tournament_id
  on conflict(id) do update set
    name=excluded.name,
    organizer=excluded.organizer,
    status='ACTIVE',
    start_date=excluded.start_date,
    end_date=excluded.end_date,
    current_matchweek=0;

  insert into public.tournament_players (tournament_id,player_id,status,joined_at)
  select sp.season_id,sp.user_id,'ACTIVE'::public.participant_status,sp.joined_at
  from legacy_20260930.season_players sp
  join public.profiles p on p.id=sp.user_id and p.role='PLAYER'
  where sp.season_id=v_legacy_tournament_id
  on conflict(tournament_id,player_id) do update set status='ACTIVE';
end;
$$;
