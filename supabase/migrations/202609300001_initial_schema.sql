create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'player');
create type public.account_status as enum ('active', 'inactive');
create type public.season_status as enum ('upcoming', 'active', 'completed', 'archived');
create type public.fixture_status as enum ('upcoming', 'result_submitted', 'pending_approval', 'completed', 'postponed', 'cancelled');
create type public.approval_status as enum ('none', 'pending', 'approved', 'rejected', 'corrected');
create type public.confirmation_status as enum ('pending', 'confirmed', 'disputed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,30}$'),
  email text,
  phone text,
  role public.user_role not null default 'player',
  profile_image text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  team_name text not null,
  team_logo text,
  game_player_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Player ' || left(new.id::text, 6)),
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), left(regexp_replace(split_part(coalesce(new.email, 'player'), '@', 1), '[^A-Za-z0-9_]', '', 'g'), 20) || '_' || left(new.id::text, 6)),
    new.email
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  organizer text not null default 'eF Masters Arena',
  status public.season_status not null default 'upcoming',
  start_date date,
  end_date date,
  current_matchweek integer not null default 1 check (current_matchweek > 0),
  tiebreakers text[] not null default array['points', 'goal_difference', 'goals_for'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.season_players (
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  matchweek integer not null check (matchweek > 0),
  home_user_id uuid not null references public.profiles(id),
  away_user_id uuid not null references public.profiles(id),
  match_date date,
  match_time time,
  home_score smallint check (home_score between 0 and 99),
  away_score smallint check (away_score between 0 and 99),
  status public.fixture_status not null default 'upcoming',
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  opponent_confirmation public.confirmation_status,
  approval_status public.approval_status not null default 'none',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  result_screenshot text,
  dispute_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_user_id <> away_user_id),
  check ((home_score is null and away_score is null) or (home_score is not null and away_score is not null)),
  unique (season_id, home_user_id, away_user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  message text not null,
  fixture_id uuid references public.fixtures(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  season_id uuid references public.seasons(id) on delete set null,
  fixture_id uuid references public.fixtures(id) on delete set null,
  action text not null,
  performed_by uuid references public.profiles(id) on delete set null,
  previous_data jsonb,
  new_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index fixtures_season_matchweek_idx on public.fixtures (season_id, matchweek);
create index fixtures_approval_idx on public.fixtures (season_id, approval_status) where approval_status = 'pending';
create index fixtures_home_idx on public.fixtures (home_user_id, season_id);
create index fixtures_away_idx on public.fixtures (away_user_id, season_id);
create index notifications_user_unread_idx on public.notifications (user_id, is_read, created_at desc);
create index audit_logs_fixture_idx on public.audit_logs (fixture_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger seasons_updated_at before update on public.seasons for each row execute function public.set_updated_at();
create trigger fixtures_updated_at before update on public.fixtures for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

create or replace function public.current_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_read_result_screenshot(object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.fixtures f
    where f.id::text = (storage.foldername(object_name))[2]
      and auth.uid() in (f.home_user_id, f.away_user_id)
  );
$$;

create or replace function public.submit_fixture_result(p_fixture_id uuid, p_home_score integer, p_away_score integer, p_screenshot_url text default null)
returns public.fixtures language plpgsql security definer set search_path = public as $$
declare v_fixture public.fixtures; v_actor uuid := auth.uid(); v_opponent uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_home_score not between 0 and 99 or p_away_score not between 0 and 99 then raise exception 'Invalid score'; end if;
  select * into v_fixture from public.fixtures where id = p_fixture_id for update;
  if not found then raise exception 'Fixture not found'; end if;
  if v_actor not in (v_fixture.home_user_id, v_fixture.away_user_id) then raise exception 'Only a player in this fixture may submit'; end if;
  if p_screenshot_url is not null and p_screenshot_url not like v_actor::text || '/' || p_fixture_id::text || '/%' then raise exception 'Invalid evidence path'; end if;
  if v_fixture.approval_status in ('pending', 'approved', 'corrected') then raise exception 'This fixture already has an active result'; end if;
  if v_fixture.status in ('cancelled', 'postponed') then raise exception 'This fixture is not open for results'; end if;
  v_opponent := case when v_actor = v_fixture.home_user_id then v_fixture.away_user_id else v_fixture.home_user_id end;
  update public.fixtures set home_score = p_home_score, away_score = p_away_score, submitted_by = v_actor,
    submitted_at = now(), status = 'pending_approval', approval_status = 'pending', opponent_confirmation = 'pending',
    result_screenshot = p_screenshot_url, dispute_reason = null, approved_by = null, approved_at = null
  where id = p_fixture_id returning * into v_fixture;
  insert into public.notifications(user_id, type, message, fixture_id) values
    (v_opponent, 'result_submitted', 'Your opponent submitted a result. Please confirm or dispute it.', p_fixture_id);
  insert into public.notifications(user_id, type, message, fixture_id)
    select id, 'approval_required', 'A new result is awaiting approval.', p_fixture_id from public.profiles where role = 'admin' and status = 'active';
  return v_fixture;
end;
$$;

create or replace function public.respond_to_result(p_fixture_id uuid, p_response public.confirmation_status, p_reason text default null)
returns public.fixtures language plpgsql security definer set search_path = public as $$
declare v_fixture public.fixtures; v_actor uuid := auth.uid();
begin
  if p_response not in ('confirmed', 'disputed') then raise exception 'Invalid response'; end if;
  if p_response = 'disputed' and nullif(trim(p_reason), '') is null then raise exception 'A dispute reason is required'; end if;
  select * into v_fixture from public.fixtures where id = p_fixture_id for update;
  if not found or v_fixture.approval_status <> 'pending' then raise exception 'Pending fixture not found'; end if;
  if v_actor not in (v_fixture.home_user_id, v_fixture.away_user_id) or v_actor = v_fixture.submitted_by then raise exception 'Only the opponent may respond'; end if;
  update public.fixtures set opponent_confirmation = p_response, dispute_reason = case when p_response = 'disputed' then p_reason else null end
    where id = p_fixture_id returning * into v_fixture;
  insert into public.notifications(user_id, type, message, fixture_id)
    select id, 'result_response', case when p_response = 'confirmed' then 'A submitted result was confirmed.' else 'A submitted result was disputed.' end, p_fixture_id
    from public.profiles where role = 'admin' and status = 'active';
  return v_fixture;
end;
$$;

create or replace function public.review_fixture_result(p_fixture_id uuid, p_action text, p_home_score integer default null, p_away_score integer default null, p_reason text default null)
returns public.fixtures language plpgsql security definer set search_path = public as $$
declare v_fixture public.fixtures; v_previous jsonb; v_actor uuid := auth.uid();
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_action not in ('approve', 'correct', 'reject') then raise exception 'Invalid review action'; end if;
  if p_action in ('correct', 'reject') and nullif(trim(p_reason), '') is null then raise exception 'A reason is required'; end if;
  if p_action = 'correct' and (p_home_score not between 0 and 99 or p_away_score not between 0 and 99) then raise exception 'Invalid corrected score'; end if;
  select * into v_fixture from public.fixtures where id = p_fixture_id for update;
  if not found or v_fixture.approval_status not in ('pending', 'approved', 'corrected') then raise exception 'Reviewable fixture not found'; end if;
  v_previous := to_jsonb(v_fixture);
  if p_action = 'approve' then
    update public.fixtures set approval_status = 'approved', status = 'completed', approved_by = v_actor, approved_at = now() where id = p_fixture_id returning * into v_fixture;
  elsif p_action = 'correct' then
    update public.fixtures set home_score = p_home_score, away_score = p_away_score, approval_status = 'corrected', status = 'completed', approved_by = v_actor, approved_at = now() where id = p_fixture_id returning * into v_fixture;
  else
    update public.fixtures set approval_status = 'rejected', status = 'upcoming', home_score = null, away_score = null, approved_by = v_actor, approved_at = now() where id = p_fixture_id returning * into v_fixture;
  end if;
  insert into public.audit_logs(season_id, fixture_id, action, performed_by, previous_data, new_data, reason)
    values (v_fixture.season_id, p_fixture_id, 'result_' || p_action, v_actor, v_previous, to_jsonb(v_fixture), p_reason);
  insert into public.notifications(user_id, type, message, fixture_id)
    select id, 'result_reviewed', case p_action when 'approve' then 'Your result is now official.' when 'correct' then 'Your result was corrected and approved.' else 'Your submitted result was rejected.' end, p_fixture_id
    from public.profiles where id in (v_fixture.home_user_id, v_fixture.away_user_id);
  return v_fixture;
end;
$$;

create or replace function public.bulk_approve_results(p_fixture_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  foreach v_id in array p_fixture_ids loop
    if exists(select 1 from public.fixtures where id = v_id and approval_status = 'pending') then
      perform public.review_fixture_result(v_id, 'approve', null, null, null); v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.seasons enable row level security;
alter table public.season_players enable row level security;
alter table public.fixtures enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "Public profiles are readable" on public.profiles for select using (status = 'active' or id = auth.uid() or public.is_admin());
create policy "Users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role());
create policy "Public teams are readable" on public.teams for select using (true);
create policy "Users update own team" on public.teams for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Seasons are public" on public.seasons for select using (true);
create policy "Season rosters are public" on public.season_players for select using (true);
create policy "Fixtures are public" on public.fixtures for select using (true);
create policy "Admins manage seasons" on public.seasons for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage rosters" on public.season_players for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins create fixtures" on public.fixtures for insert with check (public.is_admin());
create policy "Users read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "Users mark own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins read audit logs" on public.audit_logs for select using (public.is_admin());
create policy "Admins write audit logs" on public.audit_logs for insert with check (public.is_admin());

grant execute on function public.submit_fixture_result(uuid, integer, integer, text) to authenticated;
grant execute on function public.respond_to_result(uuid, public.confirmation_status, text) to authenticated;
grant execute on function public.review_fixture_result(uuid, text, integer, integer, text) to authenticated;
grant execute on function public.bulk_approve_results(uuid[]) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('result-screenshots', 'result-screenshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "Players upload result evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'result-screenshots' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.fixtures f where f.id::text = (storage.foldername(name))[2] and auth.uid() in (f.home_user_id, f.away_user_id)));
create policy "Involved players and admins read evidence" on storage.objects for select to authenticated
  using (bucket_id = 'result-screenshots' and public.can_read_result_screenshot(name));

alter publication supabase_realtime add table public.fixtures;
alter publication supabase_realtime add table public.notifications;

insert into public.seasons(name, organizer, status, current_matchweek)
values ('eF Masters Pro League 0', 'eF Masters Arena', 'active', 1)
on conflict (name) do nothing;
