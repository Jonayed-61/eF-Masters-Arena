export type StandingInput = { userId: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number };
export type VerifiedResult = { player1Id: string; player2Id: string; player1Score: number; player2Score: number };

export function calculateAvailableSlots(totalSlots: number, confirmedCount: number) {
  const availableSlots = Math.max(0, totalSlots - confirmedCount);
  return { availableSlots, isFull: availableSlots === 0 };
}

export function createRoundRobinPairs(userIds: readonly string[]) {
  const pairs: Array<[string, string]> = [];
  for (let first = 0; first < userIds.length; first += 1) {
    for (let second = first + 1; second < userIds.length; second += 1) pairs.push([userIds[first], userIds[second]]);
  }
  return pairs;
}

export function calculateStandings(userIds: readonly string[], results: readonly VerifiedResult[]) {
  const table = new Map<string, StandingInput>();
  for (const userId of userIds) table.set(userId, { userId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  for (const result of results) {
    const first = table.get(result.player1Id);
    const second = table.get(result.player2Id);
    if (!first || !second) continue;
    first.played += 1; second.played += 1;
    first.goalsFor += result.player1Score; first.goalsAgainst += result.player2Score;
    second.goalsFor += result.player2Score; second.goalsAgainst += result.player1Score;
    if (result.player1Score > result.player2Score) { first.won += 1; first.points += 3; second.lost += 1; }
    else if (result.player2Score > result.player1Score) { second.won += 1; second.points += 3; first.lost += 1; }
    else { first.drawn += 1; second.drawn += 1; first.points += 1; second.points += 1; }
  }
  return [...table.values()]
    .map((row) => ({ ...row, goalDiff: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.userId.localeCompare(b.userId))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

