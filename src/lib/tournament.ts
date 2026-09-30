import type { Fixture, GoalBreakdown, HeadToHead, Player, PlayerStats, Standing } from "./types";

export type TableMode = "live" | "official";
export type Tiebreaker = "points" | "goalDifference" | "goalsFor";

const hasScore = (fixture: Fixture): fixture is Fixture & { homeScore: number; awayScore: number } =>
  Number.isInteger(fixture.homeScore) && Number.isInteger(fixture.awayScore);

export function isFixtureIncluded(fixture: Fixture, mode: TableMode): boolean {
  if (!hasScore(fixture) || fixture.status === "cancelled" || fixture.status === "postponed") return false;
  if (mode === "official") return fixture.approvalStatus === "approved" || fixture.approvalStatus === "corrected";
  return ["pending", "approved", "corrected"].includes(fixture.approvalStatus);
}

export function validateResult(homeScore: number, awayScore: number): { valid: boolean; message?: string } {
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) return { valid: false, message: "Scores must be whole numbers." };
  if (homeScore < 0 || awayScore < 0) return { valid: false, message: "Scores cannot be negative." };
  if (homeScore > 99 || awayScore > 99) return { valid: false, message: "Scores cannot exceed 99." };
  return { valid: true };
}

export function generateFixtures(playerIds: string[], seasonId: string): Fixture[] {
  const unique = [...new Set(playerIds)];
  if (unique.length < 2) return [];
  const BYE = "__bye__";
  const rotation = unique.length % 2 ? [...unique, BYE] : [...unique];
  const roundSize = rotation.length;
  const rounds = roundSize - 1;
  const half = roundSize / 2;
  const firstLeg: Fixture[] = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let slot = 0; slot < half; slot += 1) {
      const left = rotation[slot];
      const right = rotation[roundSize - 1 - slot];
      if (left === BYE || right === BYE) continue;
      const reverse = (round + slot) % 2 === 1;
      const homeUserId = reverse ? right : left;
      const awayUserId = reverse ? left : right;
      firstLeg.push({
        id: `${seasonId}-mw${round + 1}-${homeUserId}-${awayUserId}`,
        seasonId,
        matchweek: round + 1,
        homeUserId,
        awayUserId,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
        approvalStatus: "none",
      });
    }
    rotation.splice(1, 0, rotation.pop()!);
  }

  const secondLeg = firstLeg.map((fixture) => ({
    ...fixture,
    id: `${seasonId}-mw${fixture.matchweek + rounds}-${fixture.awayUserId}-${fixture.homeUserId}`,
    matchweek: fixture.matchweek + rounds,
    homeUserId: fixture.awayUserId,
    awayUserId: fixture.homeUserId,
  }));
  return [...firstLeg, ...secondLeg];
}

export function calculateStandings(
  players: Player[],
  fixtures: Fixture[],
  mode: TableMode,
  tiebreakers: Tiebreaker[] = ["points", "goalDifference", "goalsFor"],
): Standing[] {
  const table = new Map<string, Standing>();
  players.forEach((player) => table.set(player.id, {
    position: 0,
    playerId: player.id,
    playerName: player.name,
    teamName: player.teamName,
    played: 0, wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [],
  }));

  fixtures.filter((fixture) => isFixtureIncluded(fixture, mode)).forEach((fixture) => {
    const home = table.get(fixture.homeUserId);
    const away = table.get(fixture.awayUserId);
    if (!home || !away || !hasScore(fixture)) return;
    home.played += 1; away.played += 1;
    home.goalsFor += fixture.homeScore; home.goalsAgainst += fixture.awayScore;
    away.goalsFor += fixture.awayScore; away.goalsAgainst += fixture.homeScore;
    if (fixture.homeScore > fixture.awayScore) {
      home.wins += 1; home.points += 3; home.form.push("W");
      away.losses += 1; away.form.push("L");
    } else if (fixture.homeScore < fixture.awayScore) {
      away.wins += 1; away.points += 3; away.form.push("W");
      home.losses += 1; home.form.push("L");
    } else {
      home.draws += 1; away.draws += 1; home.points += 1; away.points += 1;
      home.form.push("D"); away.form.push("D");
    }
  });

  const key = (standing: Standing, tiebreaker: Tiebreaker) => standing[tiebreaker];
  return [...table.values()]
    .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst, form: row.form.slice(-5) }))
    .sort((a, b) => {
      for (const tiebreaker of tiebreakers) {
        const difference = key(b, tiebreaker) - key(a, tiebreaker);
        if (difference) return difference;
      }
      return a.playerName.localeCompare(b.playerName);
    })
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export const calculateProvisionalStandings = (players: Player[], fixtures: Fixture[]) => calculateStandings(players, fixtures, "live");
export const calculateOfficialStandings = (players: Player[], fixtures: Fixture[]) => calculateStandings(players, fixtures, "official");
export const hasPendingResults = (fixtures: Fixture[]) => fixtures.some((fixture) => fixture.approvalStatus === "pending" && hasScore(fixture));
export const getCurrentTableStatus = (fixtures: Fixture[]) => hasPendingResults(fixtures) ? "UNOFFICIAL" as const : "OFFICIAL" as const;

export function calculateGoalLeaderboard(players: Player[], fixtures: Fixture[], mode: TableMode = "live") {
  return calculateStandings(players, fixtures, mode).sort((a, b) => b.goalsFor - a.goalsFor || b.goalDifference - a.goalDifference)
    .map((row, index) => ({ ...row, rank: index + 1, goalsPerMatch: row.played ? row.goalsFor / row.played : 0 }));
}

export const calculateOfficialGoalLeaderboard = (players: Player[], fixtures: Fixture[]) => calculateGoalLeaderboard(players, fixtures, "official");

export function calculateGoalsByOpponent(playerId: string, players: Player[], fixtures: Fixture[], mode: TableMode = "live"): GoalBreakdown[] {
  const names = new Map(players.map((player) => [player.id, player.name]));
  const rows = new Map<string, GoalBreakdown>();
  fixtures.filter((fixture) => isFixtureIncluded(fixture, mode) && [fixture.homeUserId, fixture.awayUserId].includes(playerId)).forEach((fixture) => {
    if (!hasScore(fixture)) return;
    const isHome = fixture.homeUserId === playerId;
    const opponentId = isHome ? fixture.awayUserId : fixture.homeUserId;
    const scored = isHome ? fixture.homeScore : fixture.awayScore;
    const conceded = isHome ? fixture.awayScore : fixture.homeScore;
    const row = rows.get(opponentId) ?? { opponentId, opponentName: names.get(opponentId) ?? "Unknown", matchesPlayed: 0, goalsScored: 0, goalsConceded: 0, goalDifference: 0, wins: 0, draws: 0, losses: 0 };
    row.matchesPlayed += 1; row.goalsScored += scored; row.goalsConceded += conceded;
    if (scored > conceded) row.wins += 1; else if (scored < conceded) row.losses += 1; else row.draws += 1;
    row.goalDifference = row.goalsScored - row.goalsConceded;
    rows.set(opponentId, row);
  });
  return [...rows.values()].sort((a, b) => b.goalsScored - a.goalsScored);
}

export function calculateHeadToHead(playerAId: string, playerBId: string, players: Player[], fixtures: Fixture[], mode: TableMode = "live"): HeadToHead | null {
  const playerA = players.find((player) => player.id === playerAId);
  const playerB = players.find((player) => player.id === playerBId);
  if (!playerA || !playerB || playerAId === playerBId) return null;
  const history = fixtures.filter((fixture) => isFixtureIncluded(fixture, mode) &&
    ((fixture.homeUserId === playerAId && fixture.awayUserId === playerBId) || (fixture.homeUserId === playerBId && fixture.awayUserId === playerAId)));
  let playerAGoals = 0, playerBGoals = 0, playerAWins = 0, playerBWins = 0, draws = 0;
  let playerAHomeGoals = 0, playerAAwayGoals = 0, playerBHomeGoals = 0, playerBAwayGoals = 0;
  history.forEach((fixture) => {
    if (!hasScore(fixture)) return;
    const aHome = fixture.homeUserId === playerAId;
    const aGoals = aHome ? fixture.homeScore : fixture.awayScore;
    const bGoals = aHome ? fixture.awayScore : fixture.homeScore;
    playerAGoals += aGoals; playerBGoals += bGoals;
    if (aHome) { playerAHomeGoals += aGoals; playerBAwayGoals += bGoals; }
    else { playerAAwayGoals += aGoals; playerBHomeGoals += bGoals; }
    if (aGoals > bGoals) playerAWins += 1; else if (aGoals < bGoals) playerBWins += 1; else draws += 1;
  });
  return {
    playerA, playerB, matchesPlayed: history.length, playerAWins, playerBWins, draws,
    playerAGoals, playerBGoals,
    playerAGoalDifference: playerAGoals - playerBGoals,
    playerBGoalDifference: playerBGoals - playerAGoals,
    averageGoals: history.length ? (playerAGoals + playerBGoals) / history.length : 0,
    playerAHomeGoals, playerAAwayGoals, playerBHomeGoals, playerBAwayGoals,
    matchHistory: history.sort((a, b) => b.matchweek - a.matchweek),
  };
}

export function calculatePlayerStats(playerId: string, players: Player[], fixtures: Fixture[], mode: TableMode = "live"): PlayerStats | null {
  const standing = calculateStandings(players, fixtures, mode).find((row) => row.playerId === playerId);
  if (!standing) return null;
  const relevant = fixtures.filter((fixture) => isFixtureIncluded(fixture, mode) && [fixture.homeUserId, fixture.awayUserId].includes(playerId) && hasScore(fixture));
  const record = (home: boolean) => {
    const matches = relevant.filter((fixture) => (fixture.homeUserId === playerId) === home);
    return matches.reduce((acc, fixture) => {
      const scored = home ? fixture.homeScore! : fixture.awayScore!;
      const conceded = home ? fixture.awayScore! : fixture.homeScore!;
      acc.played += 1;
      if (scored > conceded) acc.wins += 1; else if (scored === conceded) acc.draws += 1; else acc.losses += 1;
      return acc;
    }, { played: 0, wins: 0, draws: 0, losses: 0 });
  };
  const margin = (fixture: Fixture) => fixture.homeUserId === playerId ? fixture.homeScore! - fixture.awayScore! : fixture.awayScore! - fixture.homeScore!;
  const byMargin = [...relevant].sort((a, b) => margin(b) - margin(a));
  const byTotal = [...relevant].sort((a, b) => (b.homeScore! + b.awayScore!) - (a.homeScore! + a.awayScore!));
  return {
    ...standing,
    goalsPerMatch: standing.played ? standing.goalsFor / standing.played : 0,
    winPercentage: standing.played ? standing.wins / standing.played * 100 : 0,
    drawPercentage: standing.played ? standing.draws / standing.played * 100 : 0,
    lossPercentage: standing.played ? standing.losses / standing.played * 100 : 0,
    homeRecord: record(true), awayRecord: record(false),
    biggestWin: byMargin.find((fixture) => margin(fixture) > 0) ?? null,
    biggestDefeat: [...byMargin].reverse().find((fixture) => margin(fixture) < 0) ?? null,
    highestScoringMatch: byTotal[0] ?? null,
  };
}

export const calculateOfficialPlayerStats = (playerId: string, players: Player[], fixtures: Fixture[]) => calculatePlayerStats(playerId, players, fixtures, "official");
export const calculatePlayerForm = (playerId: string, players: Player[], fixtures: Fixture[], mode: TableMode = "live") => calculateStandings(players, fixtures, mode).find((row) => row.playerId === playerId)?.form ?? [];
export const recalculateSeasonStats = (players: Player[], fixtures: Fixture[]) => ({
  liveStandings: calculateProvisionalStandings(players, fixtures),
  officialStandings: calculateOfficialStandings(players, fixtures),
  liveGoals: calculateGoalLeaderboard(players, fixtures),
  officialGoals: calculateOfficialGoalLeaderboard(players, fixtures),
  status: getCurrentTableStatus(fixtures),
});
