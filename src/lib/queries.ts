import "server-only";

import type { Fixture, GoalLeaderRow, Profile, ResultSubmission, StandingRow, Tournament } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface PublicTournamentSummary extends Tournament {
  player_count: number;
}

export async function getPublicTournaments(): Promise<PublicTournamentSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("public_tournament_summaries");
  if (error) return [];
  return (data ?? []) as PublicTournamentSummary[];
}

export async function getActiveTournament(): Promise<Tournament | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("tournaments").select("*").eq("status", "ACTIVE").order("start_date", { ascending: false }).limit(1).maybeSingle();
  return data as Tournament | null;
}

const fixtureSelect = `
  *,
  tournament:tournaments(id,name),
  home_player:profiles!fixtures_home_player_id_fkey(id,username,team_name,avatar_url),
  away_player:profiles!fixtures_away_player_id_fkey(id,username,team_name,avatar_url)
`;

export async function getPlayerDashboard(playerId: string) {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const tournament = await getActiveTournament();
  const [todayResponse, recentResponse] = await Promise.all([
    supabase.from("fixtures").select(fixtureSelect).eq("match_date", today).or(`home_player_id.eq.${playerId},away_player_id.eq.${playerId}`).not("status", "in", "(CANCELLED,COMPLETED)").order("matchweek"),
    supabase.from("result_submissions").select(`*,fixture:fixtures!inner(*,home_player:profiles!fixtures_home_player_id_fkey(id,username),away_player:profiles!fixtures_away_player_id_fkey(id,username))`).eq("status", "APPROVED").or(`home_player_id.eq.${playerId},away_player_id.eq.${playerId}`, { referencedTable: "fixtures" }).order("approved_at", { ascending: false }).limit(5),
  ]);

  let standing: StandingRow | null = null;
  let stats: Record<string, unknown> | null = null;
  if (tournament) {
    const [standingResponse, statsResponse] = await Promise.all([
      supabase.rpc("calculate_standings", { p_tournament_id: tournament.id, p_official: true }),
      supabase.rpc("player_statistics", { p_tournament_id: tournament.id, p_player_id: playerId }),
    ]);
    standing = ((standingResponse.data ?? []) as StandingRow[]).find((row) => row.player_id === playerId) ?? null;
    stats = ((statsResponse.data ?? []) as Record<string, unknown>[])[0] ?? null;
  }

  return {
    todayFixtures: (todayResponse.data ?? []) as unknown as Fixture[],
    recentResults: (recentResponse.data ?? []) as unknown as Array<ResultSubmission & { fixture: Fixture }>,
    tournament,
    standing,
    stats,
  };
}

export async function getPlayerTournaments(playerId: string): Promise<Tournament[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("tournament_players").select("tournament:tournaments(*)").eq("player_id", playerId).eq("status", "ACTIVE");
  return (data ?? []).flatMap((row) => row.tournament ? [row.tournament as unknown as Tournament] : []);
}

export interface TournamentPageData {
  tournament: Tournament;
  players: Profile[];
  fixtures: Fixture[];
  results: Array<ResultSubmission & { fixture?: Fixture }>;
  unofficial: StandingRow[];
  official: StandingRow[];
  leaderboard: GoalLeaderRow[];
  reserveDays: Array<{ id: string; reserve_date: string; active: boolean; max_matches_per_player: number }>;
  reserveRequests: Array<Record<string, unknown>>;
  penalties: Array<Record<string, unknown>>;
  audit: Array<Record<string, unknown>>;
}

export async function getTournamentPageData(tournamentId: string): Promise<TournamentPageData | null> {
  const supabase = await createServerSupabaseClient();
  const tournamentResponse = await supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle();
  if (!tournamentResponse.data) return null;

  const [playersResponse, fixturesResponse, resultsResponse, unofficialResponse, officialResponse, leaderboardResponse, reserveResponse, requestsResponse, penaltiesResponse, auditResponse] = await Promise.all([
    supabase.from("tournament_players").select("player:profiles(*)").eq("tournament_id", tournamentId).eq("status", "ACTIVE"),
    supabase.from("fixtures").select(fixtureSelect).eq("tournament_id", tournamentId).order("match_date").order("matchweek"),
    supabase.from("result_submissions").select(`*,fixture:fixtures!inner(${fixtureSelect})`).eq("fixtures.tournament_id", tournamentId).order("submitted_at", { ascending: false }),
    supabase.rpc("calculate_standings", { p_tournament_id: tournamentId, p_official: false }),
    supabase.rpc("calculate_standings", { p_tournament_id: tournamentId, p_official: true }),
    supabase.rpc("goal_leaderboard", { p_tournament_id: tournamentId, p_official: true }),
    supabase.from("reserve_days").select("*").eq("tournament_id", tournamentId).order("reserve_date"),
    supabase.from("reserve_day_requests").select("*,fixture:fixtures!inner(*),reserve_day:reserve_days(*)").eq("fixtures.tournament_id", tournamentId).order("created_at", { ascending: false }),
    supabase.from("penalties").select("*,player:profiles!penalties_player_id_fkey(username),admin:profiles!penalties_created_by_fkey(username)").eq("tournament_id", tournamentId).order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*,actor:profiles!audit_logs_actor_id_fkey(username)").eq("tournament_id", tournamentId).order("created_at", { ascending: false }).limit(100),
  ]);

  return {
    tournament: tournamentResponse.data as Tournament,
    players: (playersResponse.data ?? []).flatMap((row) => row.player ? [row.player as unknown as Profile] : []),
    fixtures: (fixturesResponse.data ?? []) as unknown as Fixture[],
    results: (resultsResponse.data ?? []) as unknown as Array<ResultSubmission & { fixture?: Fixture }>,
    unofficial: (unofficialResponse.data ?? []) as StandingRow[],
    official: (officialResponse.data ?? []) as StandingRow[],
    leaderboard: (leaderboardResponse.data ?? []) as GoalLeaderRow[],
    reserveDays: (reserveResponse.data ?? []) as TournamentPageData["reserveDays"],
    reserveRequests: (requestsResponse.data ?? []) as Array<Record<string, unknown>>,
    penalties: (penaltiesResponse.data ?? []) as Array<Record<string, unknown>>,
    audit: (auditResponse.data ?? []) as Array<Record<string, unknown>>,
  };
}

export async function getPlayerStatisticsData(tournamentId: string, playerId: string) {
  const supabase = await createServerSupabaseClient();
  const [stats, opponents, headToHeadPlayers] = await Promise.all([
    supabase.rpc("player_statistics", { p_tournament_id: tournamentId, p_player_id: playerId }),
    supabase.rpc("opponent_statistics", { p_tournament_id: tournamentId, p_player_id: playerId }),
    supabase.from("tournament_players").select("player:profiles(id,username)").eq("tournament_id", tournamentId).neq("player_id", playerId).eq("status", "ACTIVE"),
  ]);
  return {
    stats: ((stats.data ?? []) as Array<Record<string, unknown>>)[0] ?? null,
    opponents: (opponents.data ?? []) as Array<Record<string, unknown>>,
    players: (headToHeadPlayers.data ?? []).flatMap((row) => row.player ? [row.player as unknown as Pick<Profile, "id" | "username">] : []),
  };
}

export async function getAdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const tournament = await getActiveTournament();
  if (!tournament) return { tournament: null, metrics: null, overdue: [], pending: [], requests: [] };
  const [metrics, overdue, pending, requests, results] = await Promise.all([
    supabase.rpc("admin_dashboard_metrics", { p_tournament_id: tournament.id }).single(),
    supabase.from("overdue_fixtures").select("*").eq("tournament_id", tournament.id).order("match_date"),
    supabase.from("result_submissions").select(`*,fixture:fixtures!inner(${fixtureSelect})`).eq("fixtures.tournament_id", tournament.id).eq("status", "SUBMITTED").order("submitted_at"),
    supabase.from("reserve_day_requests").select("*,fixture:fixtures!inner(*),requester:profiles!reserve_day_requests_requested_by_fkey(username),reserve_day:reserve_days(*)").eq("fixtures.tournament_id", tournament.id).eq("status", "PENDING").order("created_at"),
    supabase.from("result_submissions").select("id,fixtures!inner(tournament_id)", { count: "exact", head: true }).eq("fixtures.tournament_id", tournament.id),
  ]);
  return {
    tournament,
    metrics: metrics.data as Record<string, number | string> | null,
    overdue: (overdue.data ?? []) as Array<Record<string, unknown>>,
    pending: (pending.data ?? []) as unknown as Array<ResultSubmission & { fixture: Fixture }>,
    requests: (requests.data ?? []) as Array<Record<string, unknown>>,
    results: results.count ?? 0,
  };
}

export async function getNotifications(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(25);
  return (data ?? []) as Array<{ id: string; type: string; title: string; message: string; read_at: string | null; created_at: string }>;
}
