-- Enforce the 24-hour Player result window in Asia/Dhaka and normalize
-- Opponent Left scores at the database boundary. Admin result entry is
-- intentionally unchanged and remains available after the deadline.

do $$
begin
  if not exists(select 1 from pg_constraint where conname='result_submissions_opponent_left_zero') then
    alter table public.result_submissions add constraint result_submissions_opponent_left_zero check (
      result_type<>'OPPONENT_LEFT'
      or (home_bonus_goals=3 and away_bonus_goals=0 and away_actual_goals=0)
      or (home_bonus_goals=0 and away_bonus_goals=3 and home_actual_goals=0)
    ) not valid;
  end if;
end;
$$;

create or replace function public.submit_result(
  p_fixture_id uuid,
  p_result_type public.result_type,
  p_home_actual_goals integer,
  p_away_actual_goals integer,
  p_home_bonus_goals integer,
  p_away_bonus_goals integer
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_fixture public.fixtures; v_id uuid; v_opponent uuid;
begin
  select * into v_fixture from public.fixtures where id=p_fixture_id for update;
  if auth.uid() is null or not found or auth.uid() not in(v_fixture.home_player_id,v_fixture.away_player_id) then raise exception 'You are not a participant in this fixture'; end if;
  if v_fixture.status not in('SCHEDULED','RESCHEDULED','RESERVED') then raise exception 'This fixture cannot accept a result'; end if;
  if clock_timestamp() < (v_fixture.match_date::timestamp at time zone 'Asia/Dhaka') then raise exception 'Result submission is not open yet'; end if;
  if clock_timestamp() >= ((v_fixture.match_date + 1)::timestamp at time zone 'Asia/Dhaka') then raise exception 'The submission deadline has passed'; end if;
  if exists(select 1 from public.result_submissions where fixture_id=p_fixture_id and status in('DRAFT','SUBMITTED','APPROVED')) then raise exception 'A current result already exists for this fixture'; end if;

  if p_result_type='NORMAL' then
    p_home_bonus_goals:=0; p_away_bonus_goals:=0;
  elsif p_result_type='WALKOVER' then
    p_home_actual_goals:=0; p_away_actual_goals:=0;
    if (p_home_bonus_goals=3)=(p_away_bonus_goals=3) then raise exception 'Select one Walkover winner'; end if;
    p_home_bonus_goals:=case when p_home_bonus_goals=3 then 3 else 0 end;
    p_away_bonus_goals:=case when p_away_bonus_goals=3 then 3 else 0 end;
  elsif p_result_type='OPPONENT_LEFT' then
    if auth.uid()=v_fixture.home_player_id then
      p_away_actual_goals:=0; p_home_bonus_goals:=3; p_away_bonus_goals:=0;
    else
      p_home_actual_goals:=0; p_home_bonus_goals:=0; p_away_bonus_goals:=3;
    end if;
  end if;

  insert into public.result_submissions(fixture_id,submitted_by,result_type,home_actual_goals,away_actual_goals,home_bonus_goals,away_bonus_goals,status)
    values(p_fixture_id,auth.uid(),p_result_type,p_home_actual_goals,p_away_actual_goals,p_home_bonus_goals,p_away_bonus_goals,'SUBMITTED') returning id into v_id;
  update public.fixtures set status='PENDING_ADMIN_APPROVAL' where id=p_fixture_id;
  v_opponent:=case when auth.uid()=v_fixture.home_player_id then v_fixture.away_player_id else v_fixture.home_player_id end;
  insert into public.notifications(user_id,type,title,message,target_type,target_id)
    select id,'RESULT_SUBMITTED','Result awaiting review','A result was submitted for a tournament fixture.','result_submission',v_id from public.profiles where role='ADMIN' and status='ACTIVE';
  insert into public.notifications(user_id,type,title,message,target_type,target_id)
    values(v_opponent,'RESULT_SUBMITTED','Opponent submitted a result','You may confirm, dispute, or ignore it. Admin review is not blocked.','result_submission',v_id);
  insert into public.audit_logs(actor_id,tournament_id,action,target_type,target_id,new_data)
    values(auth.uid(),v_fixture.tournament_id,'RESULT_SUBMITTED','result_submission',v_id,(select to_jsonb(r) from public.result_submissions r where r.id=v_id));
  return v_id;
end;
$$;

create or replace view public.overdue_fixtures with (security_invoker=true) as
select f.*,hp.username home_username,ap.username away_username
from public.fixtures f join public.profiles hp on hp.id=f.home_player_id join public.profiles ap on ap.id=f.away_player_id
where clock_timestamp() >= ((f.match_date + 1)::timestamp at time zone 'Asia/Dhaka')
  and f.status not in ('COMPLETED','POSTPONED','CANCELLED','RESERVED')
  and not exists(select 1 from public.result_submissions r where r.fixture_id=f.id and r.status in('DRAFT','SUBMITTED','APPROVED'));

revoke all on function public.submit_result(uuid,public.result_type,integer,integer,integer,integer) from public,anon;
grant execute on function public.submit_result(uuid,public.result_type,integer,integer,integer,integer) to authenticated;
