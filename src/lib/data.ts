import "server-only";
import { demoFixtures, demoPlayers, SEASON } from "./demo-data";
import { createClient } from "./supabase/server";
import type { Fixture, Player } from "./types";

type DbFixture = Record<string, unknown>;

function mapFixture(row: DbFixture): Fixture {
  return {
    id: String(row.id), seasonId: String(row.season_id), matchweek: Number(row.matchweek),
    homeUserId: String(row.home_user_id), awayUserId: String(row.away_user_id),
    matchDate: row.match_date ? String(row.match_date) : null, matchTime: row.match_time ? String(row.match_time) : null,
    homeScore: row.home_score == null ? null : Number(row.home_score), awayScore: row.away_score == null ? null : Number(row.away_score),
    status: row.status as Fixture["status"], approvalStatus: row.approval_status as Fixture["approvalStatus"],
    submittedBy: row.submitted_by ? String(row.submitted_by) : null, submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    opponentConfirmation: row.opponent_confirmation as Fixture["opponentConfirmation"], resultScreenshot: row.result_screenshot ? String(row.result_screenshot) : null,
  };
}

export async function getTournamentData() {
  const supabase = await createClient();
  if (!supabase) return { players: demoPlayers, fixtures: demoFixtures, season: SEASON, isDemo: true };
  const { data: season } = await supabase.from("seasons").select("*").in("status", ["active", "upcoming"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!season) return { players: demoPlayers, fixtures: demoFixtures, season: SEASON, isDemo: true };
  const [{ data: roster }, { data: fixtures }] = await Promise.all([
    supabase.from("season_players").select("user_id").eq("season_id", season.id),
    supabase.from("fixtures").select("*").eq("season_id", season.id).order("matchweek"),
  ]);
  const rosterIds = (roster ?? []).map((entry) => entry.user_id);
  const { data: profiles } = rosterIds.length
    ? await supabase.from("profiles").select("id, full_name, username, teams(team_name, team_logo, game_player_id)").in("id", rosterIds).eq("status", "active")
    : { data: [] };
  const players: Player[] = (profiles ?? []).map((row) => {
    const teamValue = row.teams as unknown;
    const team = (Array.isArray(teamValue) ? teamValue[0] : teamValue) as { team_name?: string; team_logo?: string; game_player_id?: string } | null;
    return { id: row.id, name: row.full_name, username: row.username, teamName: team?.team_name ?? "Unassigned", teamLogo: team?.team_logo, gamePlayerId: team?.game_player_id, active: true };
  });
  return { players, fixtures: (fixtures ?? []).map((row) => mapFixture(row)), season: { id: season.id, name: season.name, organizer: season.organizer, currentMatchweek: season.current_matchweek }, isDemo: false };
}
