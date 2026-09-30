-- Non-destructive bridge for projects that still have the 2026-09-30 prototype.
-- Every legacy table and enum is renamed, never dropped. The following clean
-- migration can then create the production schema with its intended names.

do $$
begin
  if to_regclass('public.seasons') is not null and to_regclass('public.tournaments') is null then
    -- The production migration intentionally does not translate legacy fixture
    -- rows because that model cannot preserve actual vs administrative goals.
    -- Stop before changing anything if real legacy fixtures exist.
    if exists (select 1 from public.fixtures) then
      raise exception 'Legacy fixtures exist. Manually reconcile them before the clean-schema upgrade.';
    end if;

    drop trigger if exists on_auth_user_created on auth.users;

    create schema if not exists legacy_20260930;

    alter table public.profiles set schema legacy_20260930;
    alter table public.teams set schema legacy_20260930;
    alter table public.seasons set schema legacy_20260930;
    alter table public.season_players set schema legacy_20260930;
    alter table public.fixtures set schema legacy_20260930;
    alter table public.notifications set schema legacy_20260930;
    alter table public.audit_logs set schema legacy_20260930;

    alter type public.user_role set schema legacy_20260930;
    alter type public.account_status set schema legacy_20260930;
    alter type public.season_status set schema legacy_20260930;
    alter type public.fixture_status set schema legacy_20260930;
    alter type public.approval_status set schema legacy_20260930;
    alter type public.confirmation_status set schema legacy_20260930;
  end if;
end;
$$;

