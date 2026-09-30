import { describe, expect, it } from "vitest";
import type { Fixture, Player } from "./types";
import { calculateGoalsByOpponent, calculateHeadToHead, calculateOfficialStandings, calculateProvisionalStandings, generateFixtures, getCurrentTableStatus } from "./tournament";

const players: Player[] = [
  { id: "a", name: "A", username: "a_player", teamName: "Alpha" },
  { id: "b", name: "B", username: "b_player", teamName: "Beta" },
  { id: "c", name: "C", username: "c_player", teamName: "Gamma" },
];
const fixture = (partial: Partial<Fixture>): Fixture => ({ id: crypto.randomUUID(), seasonId: "s", matchweek: 1, homeUserId: "a", awayUserId: "b", homeScore: null, awayScore: null, status: "upcoming", approvalStatus: "none", ...partial });

describe("fixture generation", () => {
  it.each([4, 5])("creates a duplicate-free double round robin for %s players", (count) => {
    const ids = Array.from({ length: count }, (_, index) => `p${index}`);
    const fixtures = generateFixtures(ids, "s");
    expect(fixtures).toHaveLength(count * (count - 1));
    expect(new Set(fixtures.map((item) => `${item.homeUserId}:${item.awayUserId}`)).size).toBe(fixtures.length);
    expect(fixtures.every((item) => item.homeUserId !== item.awayUserId)).toBe(true);
  });
});

describe("approval model", () => {
  const fixtures = [
    fixture({ homeScore: 1, awayScore: 0, approvalStatus: "approved", status: "completed" }),
    fixture({ id: "pending", matchweek: 2, homeUserId: "b", awayUserId: "c", homeScore: 2, awayScore: 0, approvalStatus: "pending", status: "pending_approval" }),
  ];
  it("changes live standings without changing official standings", () => {
    expect(calculateProvisionalStandings(players, fixtures).find((row) => row.playerId === "b")?.points).toBe(3);
    expect(calculateOfficialStandings(players, fixtures).find((row) => row.playerId === "b")?.points).toBe(0);
    expect(getCurrentTableStatus(fixtures)).toBe("UNOFFICIAL");
  });
  it("becomes official after approval", () => {
    const approved = fixtures.map((item) => ({ ...item, approvalStatus: "approved" as const }));
    expect(getCurrentTableStatus(approved)).toBe("OFFICIAL");
    expect(calculateOfficialStandings(players, approved).find((row) => row.playerId === "b")?.points).toBe(3);
  });
});

describe("derived statistics", () => {
  const fixtures = [
    fixture({ homeScore: 3, awayScore: 1, approvalStatus: "approved", status: "completed" }),
    fixture({ matchweek: 2, homeUserId: "b", awayUserId: "a", homeScore: 2, awayScore: 2, approvalStatus: "approved", status: "completed" }),
  ];
  it("calculates H2H correctly", () => {
    const h2h = calculateHeadToHead("a", "b", players, fixtures)!;
    expect(h2h).toMatchObject({ matchesPlayed: 2, playerAWins: 1, playerBWins: 0, draws: 1, playerAGoals: 5, playerBGoals: 3 });
  });
  it("calculates goals by opponent from both home and away matches", () => {
    expect(calculateGoalsByOpponent("a", players, fixtures)[0]).toMatchObject({ opponentId: "b", matchesPlayed: 2, goalsScored: 5, goalsConceded: 3 });
  });
  it("fully removes old effects when a result is corrected", () => {
    const original = [fixture({ homeScore: 4, awayScore: 1, approvalStatus: "approved", status: "completed" })];
    const corrected = [{ ...original[0], homeScore: 2, awayScore: 3, approvalStatus: "corrected" as const }];
    expect(calculateOfficialStandings(players, original).find((row) => row.playerId === "a")?.points).toBe(3);
    expect(calculateOfficialStandings(players, corrected).find((row) => row.playerId === "a")).toMatchObject({ points: 0, goalsFor: 2, goalsAgainst: 3 });
  });
});
