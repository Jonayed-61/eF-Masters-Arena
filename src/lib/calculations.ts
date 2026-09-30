import type { GoalLeaderRow, PlayerStatistics, StandingRow } from "@/lib/types";

export interface CalculationPlayer { id: string; username: string; teamName?: string | null }
export interface CalculationResult {
  fixtureId: string;
  homePlayerId: string;
  awayPlayerId: string;
  homeActualGoals: number;
  awayActualGoals: number;
  homeBonusGoals: number;
  awayBonusGoals: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  playedAt: string;
}
export interface PenaltyAdjustment { playerId: string; adjustment: number; reversed: boolean }

const tableScore = (result: CalculationResult, side: "home" | "away") =>
  side === "home"
    ? result.homeActualGoals + result.homeBonusGoals
    : result.awayActualGoals + result.awayBonusGoals;

function selectedResults(results: CalculationResult[], official: boolean) {
  const eligible = results.filter((result) => official ? result.status === "APPROVED" : ["DRAFT", "SUBMITTED", "APPROVED"].includes(result.status));
  const latest = new Map<string, CalculationResult>();
  for (const result of eligible.toSorted((a, b) => a.playedAt.localeCompare(b.playedAt))) latest.set(result.fixtureId, result);
  return [...latest.values()];
}

export function calculateStandings(
  players: CalculationPlayer[],
  results: CalculationResult[],
  penalties: PenaltyAdjustment[],
  official: boolean,
): StandingRow[] {
  const rows = new Map(players.map((player) => [player.id, {
    player_id: player.id, username: player.username, team_name: player.teamName ?? null,
    played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0,
    goal_difference: 0, earned_points: 0, penalty_adjustment: 0, points: 0, position: 0,
  } satisfies StandingRow]));

  for (const result of selectedResults(results, official)) {
    const home = rows.get(result.homePlayerId);
    const away = rows.get(result.awayPlayerId);
    if (!home || !away) continue;
    const homeScore = tableScore(result, "home");
    const awayScore = tableScore(result, "away");
    home.played++; away.played++;
    home.goals_for += homeScore; home.goals_against += awayScore;
    away.goals_for += awayScore; away.goals_against += homeScore;
    if (homeScore > awayScore) { home.won++; home.earned_points += 3; away.lost++; }
    else if (homeScore < awayScore) { away.won++; away.earned_points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.earned_points++; away.earned_points++; }
  }

  for (const penalty of penalties.filter((item) => !item.reversed)) {
    const row = rows.get(penalty.playerId);
    if (row) row.penalty_adjustment += penalty.adjustment;
  }

  const sorted = [...rows.values()].map((row) => ({
    ...row,
    goal_difference: row.goals_for - row.goals_against,
    points: row.earned_points + row.penalty_adjustment,
  })).sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for || a.username.localeCompare(b.username));

  return sorted.map((row, index) => ({ ...row, position: index + 1 }));
}

export const calculateUnofficialStandings = (players: CalculationPlayer[], results: CalculationResult[], penalties: PenaltyAdjustment[]) =>
  calculateStandings(players, results, penalties, false);

export const calculateOfficialStandings = (players: CalculationPlayer[], results: CalculationResult[], penalties: PenaltyAdjustment[]) =>
  calculateStandings(players, results, penalties, true);

export function calculatePlayerStatistics(playerId: string, results: CalculationResult[]): PlayerStatistics {
  const matches = selectedResults(results, true).filter((result) => result.homePlayerId === playerId || result.awayPlayerId === playerId);
  let wins = 0, draws = 0, losses = 0, scored = 0, conceded = 0;
  const form: Array<"W" | "D" | "L"> = [];
  for (const result of matches.toSorted((a, b) => a.playedAt.localeCompare(b.playedAt))) {
    const home = result.homePlayerId === playerId;
    const ownTable = tableScore(result, home ? "home" : "away");
    const theirTable = tableScore(result, home ? "away" : "home");
    scored += home ? result.homeActualGoals : result.awayActualGoals;
    conceded += home ? result.awayActualGoals : result.homeActualGoals;
    if (ownTable > theirTable) { wins++; form.push("W"); }
    else if (ownTable < theirTable) { losses++; form.push("L"); }
    else { draws++; form.push("D"); }
  }
  return {
    player_id: playerId, matches: matches.length, wins, draws, losses,
    actual_goals_scored: scored, goals_conceded: conceded, goal_difference: scored - conceded,
    goal_ratio: conceded === 0 ? (scored > 0 ? null : 0) : scored / conceded,
    win_percentage: matches.length ? (wins / matches.length) * 100 : 0,
    current_form: form.slice(-5),
  };
}

export function calculateGoalLeaderboard(players: CalculationPlayer[], results: CalculationResult[]): GoalLeaderRow[] {
  const approved = selectedResults(results, true);
  return players.map((player) => {
    const matches = approved.filter((result) => result.homePlayerId === player.id || result.awayPlayerId === player.id);
    const actualGoals = matches.reduce((sum, result) => sum + (result.homePlayerId === player.id ? result.homeActualGoals : result.awayActualGoals), 0);
    return { player_id: player.id, username: player.username, matches: matches.length, actual_goals: actualGoals, goals_per_match: matches.length ? actualGoals / matches.length : 0, rank: 0 };
  }).sort((a, b) => b.actual_goals - a.actual_goals || b.goals_per_match - a.goals_per_match || a.username.localeCompare(b.username))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function calculateOpponentStats(playerId: string, opponentId: string, results: CalculationResult[]) {
  const relevant = selectedResults(results, true).filter((result) =>
    [result.homePlayerId, result.awayPlayerId].includes(playerId) && [result.homePlayerId, result.awayPlayerId].includes(opponentId));
  return calculatePlayerStatistics(playerId, relevant);
}

export function calculateHeadToHead(playerA: string, playerB: string, results: CalculationResult[]) {
  const matches = selectedResults(results, true).filter((result) =>
    [result.homePlayerId, result.awayPlayerId].includes(playerA) && [result.homePlayerId, result.awayPlayerId].includes(playerB));
  const a = calculatePlayerStatistics(playerA, matches);
  const b = calculatePlayerStatistics(playerB, matches);
  return { matchesPlayed: matches.length, playerAWins: a.wins, playerBWins: b.wins, draws: a.draws, playerAActualGoals: a.actual_goals_scored, playerBActualGoals: b.actual_goals_scored, history: matches };
}

export function calculatePenaltyAdjustments(playerId: string, penalties: PenaltyAdjustment[]) {
  return penalties.filter((penalty) => penalty.playerId === playerId && !penalty.reversed).reduce((sum, penalty) => sum + penalty.adjustment, 0);
}
