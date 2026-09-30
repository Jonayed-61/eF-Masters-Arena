-- eF Masters Arena clean schema.
-- Review and apply with `supabase db push` to a development/staging project first.
-- This migration never drops existing tables or data.

create extension if not exists pgcrypto;

create type public.user_role as enum ('ADMIN', 'PLAYER');
create type public.profile_status as enum ('ACTIVE', 'INACTIVE');
create type public.tournament_status as enum ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
create type public.participant_status as enum ('ACTIVE', 'INACTIVE', 'WITHDRAWN');
create type public.fixture_status as enum ('SCHEDULED', 'RESULT_SUBMITTED', 'PENDING_ADMIN_APPROVAL', 'COMPLETED', 'POSTPONED', 'RESCHEDULED', 'CANCELLED', 'RESERVED');
create type public.result_type as enum ('NORMAL', 'WALKOVER', 'OPPONENT_LEFT');
create type public.result_status as enum ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
create type public.result_response_type as enum ('CONFIRMED', 'DISPUTED');
create type public.request_status as enum ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
create type public.opponent_request_status as enum ('PENDING', 'ACCEPTED', 'REJECTED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,32}$'),
  team_name text check (char_length(team_name) <= 60),
  avatar_url text,
  role public.user_role not null default 'PLAYER',
  status public.profile_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_lower_key on public.profiles (lower(username));

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  organizer text not null check (char_length(organizer) between 2 and 120),
  status public.tournament_status not null default 'DRAFT',
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  current_matchweek integer not null default 0 check (current_matchweek >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete restrict,
  status public.participant_status not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  matchweek integer not null check (matchweek > 0),
  home_player_id uuid not null references public.profiles(id) on delete restrict,
  away_player_id uuid not null references public.profiles(id) on delete restrict,
  match_date date not null,
  status public.fixture_status not null default 'SCHEDULED',
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_player_id <> away_player_id)
);

create unique index fixtures_obvious_duplicate_key on public.fixtures (
  tournament_id, matchweek, least(home_player_id, away_player_id), greatest(home_player_id, away_player_id)
) where status <> 'CANCELLED';
create index fixtures_tournament_date_idx on public.fixtures (tournament_id, match_date);
create index fixtures_home_player_idx on public.fixtures (home_player_id, match_date);
create index fixtures_away_player_idx on public.fixtures (away_player_id, match_date);

create table public.result_submissions (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  result_type public.result_type not null,
  home_actual_goals integer not null check (home_actual_goals between 0 and 99),
  away_actual_goals integer not null check (away_actual_goals between 0 and 99),
  home_bonus_goals integer not null default 0 check (home_bonus_goals between 0 and 3),
  away_bonus_goals integer not null default 0 check (away_bonus_goals between 0 and 3),
  home_table_score integer generated always as (home_actual_goals + home_bonus_goals) stored,
  away_table_score integer generated always as (away_actual_goals + away_bonus_goals) stored,
  status public.result_status not null default 'SUBMITTED',
  submitted_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  rejection_reason text,
  correction_reason text,
  check (
    (result_type = 'NORMAL' and home_bonus_goals = 0 and away_bonus_goals = 0)
    or (result_type = 'WALKOVER' and home_actual_goals = 0 and away_actual_goals = 0 and ((home_bonus_goals = 3 and away_bonus_goals = 0) or (home_bonus_goals = 0 and away_bonus_goals = 3)))
    or (result_type = 'OPPONENT_LEFT' and ((home_bonus_goals = 3 and away_bonus_goals = 0) or (home_bonus_goals = 0 and away_bonus_goals = 3)))
  ),
  check ((status = 'APPROVED' and approved_by is not null and approved_at is not null) or status <> 'APPROVED')
);

create unique index one_approved_result_per_fixture on public.result_submissions (fixture_id) where status = 'APPROVED';
create unique index one_unresolved_result_per_fixture on public.result_submissions (fixture_id) where status in ('DRAFT', 'SUBMITTED');
create index result_submissions_fixture_idx on public.result_submissions (fixture_id, submitted_at desc);

create table public.result_responses (
  id uuid primary key default gen_random_uuid(),
  result_submission_id uuid not null references public.result_submissions(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete restrict,
  response public.result_response_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (result_submission_id, player_id)
);

create table public.reserve_days (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  reserve_date date not null,
  active boolean not null default true,
  max_matches_per_player integer not null default 2 check (max_matches_per_player between 1 and 10),
  created_at timestamptz not null default now(),
  unique (tournament_id, reserve_date)
);

create table public.reserve_day_requests (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reserve_day_id uuid not null references public.reserve_days(id) on delete restrict,
  opponent_status public.opponent_request_status not null default 'PENDING',
  status public.request_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index one_pending_reserve_request on public.reserve_day_requests (fixture_id) where status = 'PENDING';

create table public.penalties (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete restrict,
  points_adjustment integer not null check (points_adjustment <> 0),
  reason text not null check (char_length(reason) between 3 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  check ((reversed_at is null and reversed_by is null) or (reversed_at is not null and reversed_by is not null))
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  target_type text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index audit_logs_tournament_idx on public.audit_logs (tournament_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger tournaments_set_updated_at before update on public.tournaments for each row execute function public.set_updated_at();
create trigger fixtures_set_updated_at before update on public.fixtures for each row execute function public.set_updated_at();
create trigger result_responses_set_updated_at before update on public.result_responses for each row execute function public.set_updated_at();

create or replace function public.prevent_email_change()
returns trigger language plpgsql as $$
begin
  if new.email is distinct from old.email then raise exception 'Primary email cannot be changed from the application'; end if;
  return new;
end;
$$;
create trigger profiles_email_immutable before update on public.profiles for each row execute function public.prevent_email_change();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_role public.user_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'PLAYER');
begin
  if v_username is null or v_username !~ '^[A-Za-z0-9_]{3,32}$' then
    raise exception 'A valid username must be supplied during Admin provisioning';
  end if;
  insert into public.profiles (id, email, username, role) values (new.id, new.email, v_username, v_role);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE');
$$;

create or replace function public.is_tournament_member(p_tournament_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists(
    select 1 from public.tournament_players
    where tournament_id = p_tournament_id and player_id = auth.uid() and status = 'ACTIVE'
  );
$$;

create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
end;
$$;

create or replace function public.public_tournament_summaries()
returns table (
  id uuid, name text, organizer text, status public.tournament_status, start_date date, end_date date,
  current_matchweek integer, created_at timestamptz, updated_at timestamptz, player_count bigint
) language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.organizer, t.status, t.start_date, t.end_date, t.current_matchweek,
    t.created_at, t.updated_at, count(tp.id) filter (where tp.status = 'ACTIVE')
  from public.tournaments t
  left join public.tournament_players tp on tp.tournament_id = t.id
  where t.status = 'ACTIVE'
  group by t.id;
$$;

create or replace function public.calculate_standings(p_tournament_id uuid, p_official boolean)
returns table (
  player_id uuid, username text, team_name text, played bigint, won bigint, drawn bigint, lost bigint,
  goals_for bigint, goals_against bigint, goal_difference bigint, earned_points bigint,
  penalty_adjustment bigint, points bigint, "position" bigint
) language sql stable security definer set search_path = public as $$
  with participants as (
    select p.id, p.username, p.team_name
    from public.tournament_players tp join public.profiles p on p.id = tp.player_id
    where tp.tournament_id = p_tournament_id and tp.status = 'ACTIVE' and public.is_tournament_member(p_tournament_id)
  ), selected as (
    select distinct on (r.fixture_id) r.*, f.home_player_id, f.away_player_id
    from public.result_submissions r join public.fixtures f on f.id = r.fixture_id
    where f.tournament_id = p_tournament_id and public.is_tournament_member(p_tournament_id)
      and ((p_official and r.status = 'APPROVED') or (not p_official and r.status in ('DRAFT', 'SUBMITTED', 'APPROVED')))
    order by r.fixture_id, r.submitted_at desc
  ), sides as (
    select home_player_id as player_id, home_table_score as gf, away_table_score as ga from selected
    union all
    select away_player_id, away_table_score, home_table_score from selected
  ), aggregates as (
    select player_id, count(*) played,
      count(*) filter (where gf > ga) won, count(*) filter (where gf = ga) drawn, count(*) filter (where gf < ga) lost,
      coalesce(sum(gf),0) goals_for, coalesce(sum(ga),0) goals_against,
      coalesce(sum(case when gf > ga then 3 when gf = ga then 1 else 0 end),0) earned_points
    from sides group by player_id
  ), adjustments as (
    select player_id, coalesce(sum(points_adjustment),0) adjustment
    from public.penalties where tournament_id = p_tournament_id and reversed_at is null group by player_id
  ), rows as (
    select p.id player_id, p.username, p.team_name,
      coalesce(a.played,0) played, coalesce(a.won,0) won, coalesce(a.drawn,0) drawn, coalesce(a.lost,0) lost,
      coalesce(a.goals_for,0) goals_for, coalesce(a.goals_against,0) goals_against,
      coalesce(a.goals_for,0)-coalesce(a.goals_against,0) goal_difference,
      coalesce(a.earned_points,0) earned_points, coalesce(adj.adjustment,0) penalty_adjustment,
      coalesce(a.earned_points,0)+coalesce(adj.adjustment,0) points
    from participants p left join aggregates a on a.player_id=p.id left join adjustments adj on adj.player_id=p.id
  )
  select rows.*, row_number() over(order by points desc, goal_difference desc, goals_for desc, username) position
  from rows order by position;
$$;

create or replace function public.goal_leaderboard(p_tournament_id uuid, p_official boolean default true)
returns table (player_id uuid, username text, matches bigint, actual_goals bigint, goals_per_match numeric, rank bigint)
language sql stable security definer set search_path = public as $$
  with selected as (
    select distinct on (r.fixture_id) r.*, f.home_player_id, f.away_player_id
    from public.result_submissions r join public.fixtures f on f.id=r.fixture_id
    where f.tournament_id=p_tournament_id and public.is_tournament_member(p_tournament_id) and ((p_official and r.status='APPROVED') or (not p_official and r.status in ('DRAFT','SUBMITTED','APPROVED')))
    order by r.fixture_id, r.submitted_at desc
  ), scores as (
    select home_player_id player_id, home_actual_goals goals from selected
    union all select away_player_id, away_actual_goals from selected
  ), rows as (
    select p.id player_id, p.username, count(s.goals) matches, coalesce(sum(s.goals),0) actual_goals,
      case when count(s.goals)=0 then 0 else round(sum(s.goals)::numeric/count(s.goals),2) end goals_per_match
    from public.tournament_players tp join public.profiles p on p.id=tp.player_id left join scores s on s.player_id=p.id
    where tp.tournament_id=p_tournament_id and tp.status='ACTIVE' and public.is_tournament_member(p_tournament_id) group by p.id,p.username
  ) select rows.*, row_number() over(order by actual_goals desc, goals_per_match desc, username) rank from rows order by rank;
$$;

create or replace function public.player_statistics(p_tournament_id uuid, p_player_id uuid)
returns table (player_id uuid, matches bigint, wins bigint, draws bigint, losses bigint, actual_goals_scored bigint,
  goals_conceded bigint, goal_difference bigint, goal_ratio numeric, win_percentage numeric, current_form text[])
language sql stable security definer set search_path = public as $$
  with selected as (
    select distinct on (r.fixture_id) r.*, f.home_player_id, f.away_player_id, f.match_date
    from public.result_submissions r join public.fixtures f on f.id=r.fixture_id
    where f.tournament_id=p_tournament_id and public.is_tournament_member(p_tournament_id) and r.status='APPROVED' and p_player_id in (f.home_player_id,f.away_player_id)
    order by r.fixture_id, r.submitted_at desc
  ), perspective as (
    select *, case when home_player_id=p_player_id then home_table_score else away_table_score end own_table,
      case when home_player_id=p_player_id then away_table_score else home_table_score end their_table,
      case when home_player_id=p_player_id then home_actual_goals else away_actual_goals end own_actual,
      case when home_player_id=p_player_id then away_actual_goals else home_actual_goals end their_actual
    from selected
  )
  select p_player_id, count(*), count(*) filter(where own_table>their_table), count(*) filter(where own_table=their_table),
    count(*) filter(where own_table<their_table), coalesce(sum(own_actual),0), coalesce(sum(their_actual),0),
    coalesce(sum(own_actual),0)-coalesce(sum(their_actual),0),
    case when coalesce(sum(their_actual),0)=0 then null else round(sum(own_actual)::numeric/sum(their_actual),2) end,
    case when count(*)=0 then 0 else round(100.0*count(*) filter(where own_table>their_table)/count(*),2) end,
    coalesce((select array_agg(outcome order by match_date, submitted_at) from (
      select match_date, submitted_at, case when own_table>their_table then 'W' when own_table=their_table then 'D' else 'L' end outcome
      from perspective order by match_date desc,submitted_at desc limit 5
    ) recent), '{}'::text[])
  from perspective;
$$;

create or replace function public.opponent_statistics(p_tournament_id uuid, p_player_id uuid)
returns table (opponent_id uuid, opponent_username text, matches bigint, actual_goals_scored bigint, goals_conceded bigint, wins bigint, draws bigint, losses bigint)
language sql stable security definer set search_path = public as $$
  with selected as (
    select distinct on(r.fixture_id) r.*,f.home_player_id,f.away_player_id from public.result_submissions r join public.fixtures f on f.id=r.fixture_id
    where f.tournament_id=p_tournament_id and public.is_tournament_member(p_tournament_id) and r.status='APPROVED' and p_player_id in(f.home_player_id,f.away_player_id)
    order by r.fixture_id,r.submitted_at desc
  ), perspective as (
    select case when home_player_id=p_player_id then away_player_id else home_player_id end opponent_id,
      case when home_player_id=p_player_id then home_actual_goals else away_actual_goals end own_actual,
      case when home_player_id=p_player_id then away_actual_goals else home_actual_goals end their_actual,
      case when home_player_id=p_player_id then home_table_score else away_table_score end own_table,
      case when home_player_id=p_player_id then away_table_score else home_table_score end their_table from selected
  ) select x.opponent_id,p.username,count(*),sum(own_actual),sum(their_actual),count(*) filter(where own_table>their_table),
    count(*) filter(where own_table=their_table),count(*) filter(where own_table<their_table)
  from perspective x join public.profiles p on p.id=x.opponent_id group by x.opponent_id,p.username order by p.username;
$$;

create or replace function public.head_to_head(p_tournament_id uuid, p_player_a uuid, p_player_b uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  with matches as (
    select r.*,f.home_player_id,f.away_player_id,f.match_date,f.matchweek from public.result_submissions r join public.fixtures f on f.id=r.fixture_id
    where f.tournament_id=p_tournament_id and public.is_tournament_member(p_tournament_id) and r.status='APPROVED' and f.home_player_id in(p_player_a,p_player_b) and f.away_player_id in(p_player_a,p_player_b)
  ) select jsonb_build_object(
    'matches_played',count(*),
    'player_a_wins',count(*) filter(where (home_player_id=p_player_a and home_table_score>away_table_score) or (away_player_id=p_player_a and away_table_score>home_table_score)),
    'player_b_wins',count(*) filter(where (home_player_id=p_player_b and home_table_score>away_table_score) or (away_player_id=p_player_b and away_table_score>home_table_score)),
    'draws',count(*) filter(where home_table_score=away_table_score),
    'player_a_actual_goals',coalesce(sum(case when home_player_id=p_player_a then home_actual_goals else away_actual_goals end),0),
    'player_b_actual_goals',coalesce(sum(case when home_player_id=p_player_b then home_actual_goals else away_actual_goals end),0),
    'history',coalesce(jsonb_agg(to_jsonb(matches) order by match_date desc),'[]'::jsonb)
  ) from matches;
$$;

create or replace view public.overdue_fixtures with (security_invoker=true) as
select f.*,hp.username home_username,ap.username away_username
from public.fixtures f join public.profiles hp on hp.id=f.home_player_id join public.profiles ap on ap.id=f.away_player_id
where f.match_date < current_date and f.status not in ('COMPLETED','POSTPONED','CANCELLED','RESERVED')
  and not exists(select 1 from public.result_submissions r where r.fixture_id=f.id and r.status in('DRAFT','SUBMITTED','APPROVED'));

create or replace function public.admin_dashboard_metrics(p_tournament_id uuid)
returns table(total_players bigint,total_fixtures bigint,matches_completed bigint,remaining_matches bigint,pending_results bigint,disputed_results bigint,current_matchweek integer,overdue_fixtures bigint,reserve_requests bigint)
language sql stable security definer set search_path=public as $$
  select
    (select count(*) from public.tournament_players where tournament_id=p_tournament_id and status='ACTIVE'),
    (select count(*) from public.fixtures where tournament_id=p_tournament_id and status<>'CANCELLED'),
    (select count(*) from public.fixtures where tournament_id=p_tournament_id and status='COMPLETED'),
    (select count(*) from public.fixtures where tournament_id=p_tournament_id and status not in('COMPLETED','CANCELLED')),
    (select count(*) from public.result_submissions r join public.fixtures f on f.id=r.fixture_id where f.tournament_id=p_tournament_id and r.status in('DRAFT','SUBMITTED')),
    (select count(*) from public.result_responses rr join public.result_submissions r on r.id=rr.result_submission_id join public.fixtures f on f.id=r.fixture_id where f.tournament_id=p_tournament_id and rr.response='DISPUTED' and r.status='SUBMITTED'),
    (select current_matchweek from public.tournaments where id=p_tournament_id),
    (select count(*) from public.overdue_fixtures where tournament_id=p_tournament_id),
    (select count(*) from public.reserve_day_requests q join public.fixtures f on f.id=q.fixture_id where f.tournament_id=p_tournament_id and q.status='PENDING')
  where public.is_admin();
$$;

create or replace function public.update_my_profile(p_username text,p_team_name text,p_avatar_url text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_username !~ '^[A-Za-z0-9_]{3,32}$' then raise exception 'Invalid username'; end if;
  update public.profiles set username=p_username,team_name=nullif(trim(p_team_name),''),avatar_url=nullif(trim(p_avatar_url),'') where id=auth.uid();
  insert into public.audit_logs(actor_id,action,target_type,target_id,new_data) values(auth.uid(),'PROFILE_UPDATED','profile',auth.uid(),jsonb_build_object('username',p_username,'team_name',p_team_name,'avatar_url',p_avatar_url));
end;
$$;

create or replace function public.submit_result(p_fixture_id uuid,p_result_type public.result_type,p_home_actual_goals integer,p_away_actual_goals integer,p_home_bonus_goals integer,p_away_bonus_goals integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_fixture public.fixtures; v_id uuid; v_opponent uuid;
begin
  select * into v_fixture from public.fixtures where id=p_fixture_id for update;
  if auth.uid() is null or not found or auth.uid() not in(v_fixture.home_player_id,v_fixture.away_player_id) then raise exception 'You are not a participant in this fixture'; end if;
  if v_fixture.status in('COMPLETED','CANCELLED') then raise exception 'This fixture cannot accept a result'; end if;
  if exists(select 1 from public.result_submissions where fixture_id=p_fixture_id and status in('DRAFT','SUBMITTED','APPROVED')) then raise exception 'A current result already exists for this fixture'; end if;
  insert into public.result_submissions(fixture_id,submitted_by,result_type,home_actual_goals,away_actual_goals,home_bonus_goals,away_bonus_goals,status)
    values(p_fixture_id,auth.uid(),p_result_type,p_home_actual_goals,p_away_actual_goals,p_home_bonus_goals,p_away_bonus_goals,'SUBMITTED') returning id into v_id;
  update public.fixtures set status='PENDING_ADMIN_APPROVAL' where id=p_fixture_id;
  v_opponent:=case when auth.uid()=v_fixture.home_player_id then v_fixture.away_player_id else v_fixture.home_player_id end;
  insert into public.notifications(user_id,type,title,message,target_type,target_id)
    select id,'RESULT_SUBMITTED','Result awaiting review','A result was submitted for a tournament fixture.','result_submission',v_id from public.profiles where role='ADMIN' and status='ACTIVE';
  insert into public.notifications(user_id,type,title,message,target_type,target_id) values(v_opponent,'RESULT_SUBMITTED','Opponent submitted a result','You may confirm, dispute, or ignore it. Admin review is not blocked.','result_submission',v_id);
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,new_data) values(auth.uid(),v_fixture.tournament_id,'RESULT_SUBMITTED','result_submission',v_id,(select to_jsonb(r) from public.result_submissions r where r.id=v_id));
  return v_id;
end;
$$;

create or replace function public.respond_to_result(p_submission_id uuid,p_response public.result_response_type)
returns void language plpgsql security definer set search_path=public as $$
declare v_result public.result_submissions; v_fixture public.fixtures;
begin
  select * into v_result from public.result_submissions where id=p_submission_id;
  select * into v_fixture from public.fixtures where id=v_result.fixture_id;
  if auth.uid() is null or v_result.status<>'SUBMITTED' or auth.uid()=v_result.submitted_by or auth.uid() not in(v_fixture.home_player_id,v_fixture.away_player_id) then raise exception 'You cannot respond to this result'; end if;
  insert into public.result_responses(result_submission_id,player_id,response) values(p_submission_id,auth.uid(),p_response)
    on conflict(result_submission_id,player_id) do update set response=excluded.response,updated_at=now();
  insert into public.notifications(user_id,type,title,message,target_type,target_id)
    select id,case when p_response='CONFIRMED' then 'OPPONENT_CONFIRMED' else 'OPPONENT_DISPUTED' end,
      case when p_response='CONFIRMED' then 'Opponent confirmed result' else 'Opponent disputed result' end,
      'Opponent response recorded; Admin review remains available.','result_submission',p_submission_id
    from public.profiles where role='ADMIN' and status='ACTIVE';
end;
$$;

create or replace function public.admin_create_fixture(p_tournament_id uuid,p_matchweek integer,p_home_player_id uuid,p_away_player_id uuid,p_match_date date,p_status public.fixture_status,p_notes text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  perform public.assert_admin();
  if p_home_player_id=p_away_player_id then raise exception 'Players must differ'; end if;
  if p_status in('RESULT_SUBMITTED','PENDING_ADMIN_APPROVAL','COMPLETED') then raise exception 'A new fixture cannot start in a result or completed state'; end if;
  if (select count(*) from public.tournament_players where tournament_id=p_tournament_id and player_id in(p_home_player_id,p_away_player_id) and status='ACTIVE')<>2 then raise exception 'Both players must be active tournament participants'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_date::text||least(p_home_player_id,p_away_player_id)::text||greatest(p_home_player_id,p_away_player_id)::text,0));
  if exists(
    select 1 from public.reserve_days rd where rd.tournament_id=p_tournament_id and rd.reserve_date=p_match_date and rd.active
      and ((select count(*) from public.fixtures f where f.match_date=p_match_date and f.status<>'CANCELLED' and p_home_player_id in(f.home_player_id,f.away_player_id))>=rd.max_matches_per_player
        or (select count(*) from public.fixtures f where f.match_date=p_match_date and f.status<>'CANCELLED' and p_away_player_id in(f.home_player_id,f.away_player_id))>=rd.max_matches_per_player)
  ) then raise exception 'Reserve Day capacity reached for one or both players'; end if;
  insert into public.fixtures(tournament_id,matchweek,home_player_id,away_player_id,match_date,status,notes)
    values(p_tournament_id,p_matchweek,p_home_player_id,p_away_player_id,p_match_date,p_status,nullif(trim(p_notes),'')) returning id into v_id;
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,new_data) values(auth.uid(),p_tournament_id,'FIXTURE_CREATED','fixture',v_id,(select to_jsonb(f) from public.fixtures f where f.id=v_id));
  return v_id;
end;
$$;

create or replace function public.admin_review_result(p_submission_id uuid,p_decision text,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_result public.result_submissions; v_fixture public.fixtures; v_old jsonb;
begin
  perform public.assert_admin();
  select * into v_result from public.result_submissions where id=p_submission_id for update;
  if not found or v_result.status not in('DRAFT','SUBMITTED') then raise exception 'Result is no longer awaiting review'; end if;
  select * into v_fixture from public.fixtures where id=v_result.fixture_id;
  v_old:=to_jsonb(v_result);
  if p_decision='APPROVE' then
    update public.result_submissions set status='APPROVED',approved_by=auth.uid(),approved_at=now(),rejection_reason=null where id=p_submission_id;
    update public.fixtures set status='COMPLETED' where id=v_result.fixture_id;
    insert into public.notifications(user_id,type,title,message,target_type,target_id)
      select player_id,'RESULT_APPROVED','Result approved','The official table has been recalculated.','result_submission',p_submission_id from public.tournament_players where tournament_id=v_fixture.tournament_id and player_id in(v_fixture.home_player_id,v_fixture.away_player_id);
  elsif p_decision='REJECT' then
    if nullif(trim(p_reason),'') is null then raise exception 'Rejection reason is required'; end if;
    update public.result_submissions set status='REJECTED',rejection_reason=p_reason where id=p_submission_id;
    update public.fixtures set status='SCHEDULED' where id=v_result.fixture_id;
    insert into public.notifications(user_id,type,title,message,target_type,target_id) values(v_result.submitted_by,'RESULT_REJECTED','Result rejected',p_reason,'result_submission',p_submission_id);
  else raise exception 'Invalid review decision'; end if;
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,old_data,new_data,reason)
    values(auth.uid(),v_fixture.tournament_id,'RESULT_'||p_decision,'result_submission',p_submission_id,v_old,(select to_jsonb(r) from public.result_submissions r where r.id=p_submission_id),p_reason);
end;
$$;

create or replace function public.admin_enter_result(p_fixture_id uuid,p_result_type public.result_type,p_home_actual_goals integer,p_away_actual_goals integer,p_home_bonus_goals integer,p_away_bonus_goals integer,p_final boolean,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_fixture public.fixtures; v_old jsonb; v_id uuid;
begin
  perform public.assert_admin();
  if nullif(trim(p_reason),'') is null then raise exception 'Administrative reason is required'; end if;
  select * into v_fixture from public.fixtures where id=p_fixture_id for update;
  if not found then raise exception 'Fixture not found'; end if;
  select to_jsonb(r) into v_old from public.result_submissions r where fixture_id=p_fixture_id and status in('DRAFT','SUBMITTED','APPROVED') order by submitted_at desc limit 1;
  update public.result_submissions set status='REJECTED',correction_reason=p_reason where fixture_id=p_fixture_id and status in('DRAFT','SUBMITTED','APPROVED');
  insert into public.result_submissions(fixture_id,submitted_by,result_type,home_actual_goals,away_actual_goals,home_bonus_goals,away_bonus_goals,status,approved_by,approved_at,correction_reason)
    values(p_fixture_id,auth.uid(),p_result_type,p_home_actual_goals,p_away_actual_goals,p_home_bonus_goals,p_away_bonus_goals,case when p_final then 'APPROVED'::public.result_status else 'DRAFT'::public.result_status end,case when p_final then auth.uid() end,case when p_final then now() end,p_reason) returning id into v_id;
  update public.fixtures set status=case when p_final then 'COMPLETED'::public.fixture_status else 'PENDING_ADMIN_APPROVAL'::public.fixture_status end where id=p_fixture_id;
  insert into public.notifications(user_id,type,title,message,target_type,target_id)
    select player_id,case when v_old is null then 'RESULT_APPROVED' else 'RESULT_CORRECTED' end,case when v_old is null then 'Admin entered a result' else 'Result corrected' end,p_reason,'result_submission',v_id
    from public.tournament_players where tournament_id=v_fixture.tournament_id and player_id in(v_fixture.home_player_id,v_fixture.away_player_id);
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,old_data,new_data,reason)
    values(auth.uid(),v_fixture.tournament_id,case when v_old is null then 'RESULT_ENTERED' else 'RESULT_CORRECTED' end,'result_submission',v_id,v_old,(select to_jsonb(r) from public.result_submissions r where r.id=v_id),p_reason);
  return v_id;
end;
$$;

create or replace function public.reserve_day_availability(p_fixture_id uuid)
returns table(reserve_day_id uuid,reserve_date date,max_matches_per_player integer,home_match_count bigint,away_match_count bigint,available boolean)
language sql stable security definer set search_path=public as $$
  select rd.id,rd.reserve_date,rd.max_matches_per_player,
    (select count(*) from public.fixtures x where x.id<>f.id and x.match_date=rd.reserve_date and x.status<>'CANCELLED' and f.home_player_id in(x.home_player_id,x.away_player_id)),
    (select count(*) from public.fixtures x where x.id<>f.id and x.match_date=rd.reserve_date and x.status<>'CANCELLED' and f.away_player_id in(x.home_player_id,x.away_player_id)),
    (select count(*) from public.fixtures x where x.id<>f.id and x.match_date=rd.reserve_date and x.status<>'CANCELLED' and f.home_player_id in(x.home_player_id,x.away_player_id))<rd.max_matches_per_player
      and (select count(*) from public.fixtures x where x.id<>f.id and x.match_date=rd.reserve_date and x.status<>'CANCELLED' and f.away_player_id in(x.home_player_id,x.away_player_id))<rd.max_matches_per_player
  from public.fixtures f join public.reserve_days rd on rd.tournament_id=f.tournament_id and rd.active
  where f.id=p_fixture_id and (auth.uid() in(f.home_player_id,f.away_player_id) or public.is_admin()) and rd.reserve_date>=current_date order by rd.reserve_date;
$$;

create or replace function public.request_reserve_day(p_fixture_id uuid,p_reserve_day_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_fixture public.fixtures; v_day public.reserve_days; v_available boolean; v_id uuid; v_opponent uuid;
begin
  select * into v_fixture from public.fixtures where id=p_fixture_id for update;
  if auth.uid() is null or auth.uid() not in(v_fixture.home_player_id,v_fixture.away_player_id) then raise exception 'Not your fixture'; end if;
  if v_fixture.status in('COMPLETED','CANCELLED') then raise exception 'Fixture cannot be moved'; end if;
  select * into v_day from public.reserve_days where id=p_reserve_day_id and active for update;
  if not found or v_day.tournament_id<>v_fixture.tournament_id then raise exception 'Invalid Reserve Day'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_day.reserve_date::text||least(v_fixture.home_player_id,v_fixture.away_player_id)::text||greatest(v_fixture.home_player_id,v_fixture.away_player_id)::text,0));
  select a.available into v_available from public.reserve_day_availability(p_fixture_id) a where a.reserve_day_id=p_reserve_day_id;
  if not coalesce(v_available,false) then raise exception 'Reserve Day capacity reached for one or both players'; end if;
  insert into public.reserve_day_requests(fixture_id,requested_by,reserve_day_id) values(p_fixture_id,auth.uid(),p_reserve_day_id) returning id into v_id;
  update public.fixtures set status='RESERVED' where id=p_fixture_id;
  v_opponent:=case when auth.uid()=v_fixture.home_player_id then v_fixture.away_player_id else v_fixture.home_player_id end;
  insert into public.notifications(user_id,type,title,message,target_type,target_id) values(v_opponent,'RESERVE_DAY_REQUESTED','Reserve Day requested','Your opponent requested a Reserve Day move.','reserve_day_request',v_id);
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,new_data) values(auth.uid(),v_fixture.tournament_id,'RESERVE_DAY_REQUESTED','reserve_day_request',v_id,(select to_jsonb(q) from public.reserve_day_requests q where q.id=v_id));
  return v_id;
end;
$$;

create or replace function public.respond_reserve_day(p_request_id uuid,p_response text)
returns void language plpgsql security definer set search_path=public as $$
declare v_request public.reserve_day_requests; v_fixture public.fixtures; v_day public.reserve_days; v_available boolean;
begin
  select * into v_request from public.reserve_day_requests where id=p_request_id for update;
  select * into v_fixture from public.fixtures where id=v_request.fixture_id for update;
  select * into v_day from public.reserve_days where id=v_request.reserve_day_id for update;
  if auth.uid() is null or v_request.status<>'PENDING' or auth.uid()=v_request.requested_by or auth.uid() not in(v_fixture.home_player_id,v_fixture.away_player_id) then raise exception 'Cannot respond to this request'; end if;
  if p_response='ACCEPTED' then
    perform pg_advisory_xact_lock(hashtextextended(v_day.reserve_date::text||least(v_fixture.home_player_id,v_fixture.away_player_id)::text||greatest(v_fixture.home_player_id,v_fixture.away_player_id)::text,0));
    select a.available into v_available from public.reserve_day_availability(v_fixture.id) a where a.reserve_day_id=v_day.id;
    if not coalesce(v_available,false) then raise exception 'Reserve Day capacity reached for one or both players'; end if;
    update public.reserve_day_requests set opponent_status='ACCEPTED',status='ACCEPTED',resolved_at=now() where id=p_request_id;
    update public.fixtures set match_date=v_day.reserve_date,status='RESCHEDULED',notes=concat_ws(E'\n',notes,'Moved to Reserve Day') where id=v_fixture.id;
  elsif p_response='REJECTED' then
    update public.reserve_day_requests set opponent_status='REJECTED',status='REJECTED',resolved_at=now() where id=p_request_id;
    update public.fixtures set status='SCHEDULED' where id=v_fixture.id;
  else raise exception 'Invalid response'; end if;
  insert into public.notifications(user_id,type,title,message,target_type,target_id) values(v_request.requested_by,'RESERVE_DAY_'||p_response,'Reserve Day request '||lower(p_response),'The opponent responded to your request.','reserve_day_request',p_request_id);
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,old_data,new_data) values(auth.uid(),v_fixture.tournament_id,'RESERVE_DAY_'||p_response,'reserve_day_request',p_request_id,to_jsonb(v_request),(select to_jsonb(q) from public.reserve_day_requests q where q.id=p_request_id));
end;
$$;

create or replace function public.admin_create_reserve_day(p_tournament_id uuid,p_reserve_date date,p_max_matches integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin perform public.assert_admin();
  insert into public.reserve_days(tournament_id,reserve_date,max_matches_per_player) values(p_tournament_id,p_reserve_date,p_max_matches) returning id into v_id;
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,new_data) values(auth.uid(),p_tournament_id,'RESERVE_DAY_CREATED','reserve_day',v_id,(select to_jsonb(r) from public.reserve_days r where r.id=v_id)); return v_id;
end; $$;

create or replace function public.admin_apply_penalty(p_tournament_id uuid,p_player_id uuid,p_adjustment integer,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin perform public.assert_admin();
  if not exists(select 1 from public.tournament_players where tournament_id=p_tournament_id and player_id=p_player_id) then raise exception 'Player is not in tournament'; end if;
  insert into public.penalties(tournament_id,player_id,points_adjustment,reason,created_by) values(p_tournament_id,p_player_id,p_adjustment,p_reason,auth.uid()) returning id into v_id;
  insert into public.notifications(user_id,type,title,message,target_type,target_id) values(p_player_id,'PENALTY_APPLIED','Penalty adjustment applied',p_reason,'penalty',v_id);
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,new_data,reason) values(auth.uid(),p_tournament_id,'PENALTY_APPLIED','penalty',v_id,(select to_jsonb(p) from public.penalties p where p.id=v_id),p_reason); return v_id;
end; $$;

create or replace function public.admin_reverse_penalty(p_penalty_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_old public.penalties;
begin perform public.assert_admin(); select * into v_old from public.penalties where id=p_penalty_id for update;
  if v_old.reversed_at is not null then raise exception 'Penalty already reversed'; end if;
  update public.penalties set reversed_at=now(),reversed_by=auth.uid() where id=p_penalty_id;
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,old_data,new_data,reason) values(auth.uid(),v_old.tournament_id,'PENALTY_REVERSED','penalty',p_penalty_id,to_jsonb(v_old),(select to_jsonb(p) from public.penalties p where p.id=p_penalty_id),p_reason);
end; $$;

create or replace function public.admin_update_fixture_status(p_fixture_id uuid,p_status public.fixture_status,p_match_date date,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_old public.fixtures;
begin perform public.assert_admin(); select * into v_old from public.fixtures where id=p_fixture_id for update;
  if p_status in('RESCHEDULED','RESERVED','SCHEDULED') and p_match_date is null then raise exception 'A new date is required'; end if;
  if p_match_date is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_match_date::text||least(v_old.home_player_id,v_old.away_player_id)::text||greatest(v_old.home_player_id,v_old.away_player_id)::text,0));
    if exists(
      select 1 from public.reserve_days rd where rd.tournament_id=v_old.tournament_id and rd.reserve_date=p_match_date and rd.active
        and ((select count(*) from public.fixtures f where f.id<>p_fixture_id and f.match_date=p_match_date and f.status<>'CANCELLED' and v_old.home_player_id in(f.home_player_id,f.away_player_id))>=rd.max_matches_per_player
          or (select count(*) from public.fixtures f where f.id<>p_fixture_id and f.match_date=p_match_date and f.status<>'CANCELLED' and v_old.away_player_id in(f.home_player_id,f.away_player_id))>=rd.max_matches_per_player)
    ) then raise exception 'Reserve Day capacity reached for one or both players'; end if;
  end if;
  update public.fixtures set status=p_status,match_date=coalesce(p_match_date,match_date) where id=p_fixture_id;
  insert into public.notifications(user_id,type,title,message,target_type,target_id)
    select player_id,'FIXTURE_'||p_status,'Fixture '||lower(p_status),p_reason,'fixture',p_fixture_id from public.tournament_players where tournament_id=v_old.tournament_id and player_id in(v_old.home_player_id,v_old.away_player_id);
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,old_data,new_data,reason) values(auth.uid(),v_old.tournament_id,'FIXTURE_'||p_status,'fixture',p_fixture_id,to_jsonb(v_old),(select to_jsonb(f) from public.fixtures f where f.id=p_fixture_id),p_reason);
end; $$;

create or replace function public.admin_update_tournament(p_tournament_id uuid,p_name text,p_organizer text,p_status public.tournament_status,p_start_date date,p_end_date date,p_current_matchweek integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_old public.tournaments;
begin perform public.assert_admin(); select * into v_old from public.tournaments where id=p_tournament_id for update;
  update public.tournaments set name=p_name,organizer=p_organizer,status=p_status,start_date=p_start_date,end_date=p_end_date,current_matchweek=p_current_matchweek where id=p_tournament_id;
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,old_data,new_data) values(auth.uid(),p_tournament_id,'TOURNAMENT_UPDATED','tournament',p_tournament_id,to_jsonb(v_old),(select to_jsonb(t) from public.tournaments t where t.id=p_tournament_id));
end; $$;

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.fixtures enable row level security;
alter table public.result_submissions enable row level security;
alter table public.result_responses enable row level security;
alter table public.reserve_days enable row level security;
alter table public.reserve_day_requests enable row level security;
alter table public.penalties enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_authenticated on public.profiles for select to authenticated using (
  id=auth.uid() or public.is_admin() or exists(
    select 1 from public.tournament_players mine join public.tournament_players theirs on theirs.tournament_id=mine.tournament_id
    where mine.player_id=auth.uid() and mine.status='ACTIVE' and theirs.player_id=profiles.id and theirs.status='ACTIVE'
  )
);
create policy tournaments_public_active on public.tournaments for select to anon using (status='ACTIVE');
create policy tournaments_member_read on public.tournaments for select to authenticated using (public.is_tournament_member(id));
create policy tournament_players_member_read on public.tournament_players for select to authenticated using (public.is_tournament_member(tournament_id));
create policy fixtures_member_read on public.fixtures for select to authenticated using (public.is_tournament_member(tournament_id));
create policy results_member_read on public.result_submissions for select to authenticated using (exists(select 1 from public.fixtures f where f.id=fixture_id and public.is_tournament_member(f.tournament_id)));
create policy responses_member_read on public.result_responses for select to authenticated using (exists(select 1 from public.result_submissions r join public.fixtures f on f.id=r.fixture_id where r.id=result_submission_id and public.is_tournament_member(f.tournament_id)));
create policy reserve_days_member_read on public.reserve_days for select to authenticated using (public.is_tournament_member(tournament_id));
create policy reserve_requests_member_read on public.reserve_day_requests for select to authenticated using (exists(select 1 from public.fixtures f where f.id=fixture_id and public.is_tournament_member(f.tournament_id)));
create policy penalties_member_read on public.penalties for select to authenticated using (public.is_tournament_member(tournament_id));
create policy notifications_own_read on public.notifications for select to authenticated using (user_id=auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles,public.tournaments,public.tournament_players,public.fixtures,public.result_submissions,public.result_responses,public.reserve_days,public.reserve_day_requests,public.penalties,public.notifications,public.audit_logs,public.overdue_fixtures to authenticated;
grant select on public.tournaments to anon;
grant update(read_at) on public.notifications to authenticated;
grant execute on function public.public_tournament_summaries() to anon,authenticated;
grant execute on function public.calculate_standings(uuid,boolean),public.goal_leaderboard(uuid,boolean),public.player_statistics(uuid,uuid),public.opponent_statistics(uuid,uuid),public.head_to_head(uuid,uuid,uuid),public.admin_dashboard_metrics(uuid),public.reserve_day_availability(uuid) to authenticated;
grant execute on function public.update_my_profile(text,text,text),public.submit_result(uuid,public.result_type,integer,integer,integer,integer),public.respond_to_result(uuid,public.result_response_type),public.request_reserve_day(uuid,uuid),public.respond_reserve_day(uuid,text) to authenticated;
grant execute on function public.admin_create_fixture(uuid,integer,uuid,uuid,date,public.fixture_status,text),public.admin_review_result(uuid,text,text),public.admin_enter_result(uuid,public.result_type,integer,integer,integer,integer,boolean,text),public.admin_create_reserve_day(uuid,date,integer),public.admin_apply_penalty(uuid,uuid,integer,text),public.admin_reverse_penalty(uuid,text),public.admin_update_fixture_status(uuid,public.fixture_status,date,text),public.admin_update_tournament(uuid,text,text,public.tournament_status,date,date,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2000000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=2000000,allowed_mime_types=excluded.allowed_mime_types;
create policy avatar_public_read on storage.objects for select using(bucket_id='avatars');
create policy avatar_own_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_own_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

alter publication supabase_realtime add table public.fixtures,public.result_submissions,public.result_responses,public.reserve_day_requests,public.notifications,public.profiles,public.penalties;
