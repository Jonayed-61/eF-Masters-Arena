import { describe, expect, it } from "vitest";
import { calculateGoalLeaderboard, calculateHeadToHead, calculateOfficialStandings, calculatePlayerStatistics, calculateUnofficialStandings, type CalculationResult } from "./calculations";

const players = [{ id: "a", username: "A" }, { id: "b", username: "B" }];
const base = { fixtureId: "f1", homePlayerId: "a", awayPlayerId: "b", playedAt: "2026-10-01T00:00:00Z" };

describe("tournament source-of-truth calculations", () => {
  it("uses a normal score for table and actual goals", () => {
    const result: CalculationResult = { ...base, homeActualGoals: 4, awayActualGoals: 2, homeBonusGoals: 0, awayBonusGoals: 0, status: "APPROVED" };
    expect(calculateOfficialStandings(players, [result], [])[0]).toMatchObject({ player_id: "a", goals_for: 4, goals_against: 2, points: 3 });
    expect(calculateGoalLeaderboard(players, [result]).map((row) => row.actual_goals)).toEqual([4, 2]);
  });
  it("counts a walkover in standings and zero scorer goals", () => {
    const result: CalculationResult = { ...base, homeActualGoals: 0, awayActualGoals: 0, homeBonusGoals: 3, awayBonusGoals: 0, status: "APPROVED" };
    expect(calculateOfficialStandings(players, [result], [])[0]).toMatchObject({ goals_for: 3, points: 3 });
    expect(calculateGoalLeaderboard(players, [result]).every((row) => row.actual_goals === 0)).toBe(true);
  });
  it("uses 8 for the table and 5 actual goals when opponent leaves", () => {
    const result: CalculationResult = { ...base, homeActualGoals: 5, awayActualGoals: 0, homeBonusGoals: 3, awayBonusGoals: 0, status: "APPROVED" };
    expect(calculateOfficialStandings(players, [result], [])[0]).toMatchObject({ goals_for: 8, goals_against: 0 });
    expect(calculateGoalLeaderboard(players, [result])[0]).toMatchObject({ player_id: "a", actual_goals: 5 });
  });
  it("uses 0-7 for an away Player's four goals when the home opponent leaves", () => {
    const result: CalculationResult = { ...base, homeActualGoals: 0, awayActualGoals: 4, homeBonusGoals: 0, awayBonusGoals: 3, status: "APPROVED" };
    expect(calculateOfficialStandings(players, [result], [])[0]).toMatchObject({ player_id: "b", goals_for: 7, goals_against: 0 });
    expect(calculateGoalLeaderboard(players, [result])[0]).toMatchObject({ player_id: "b", actual_goals: 4 });
  });
  it("separates unofficial and official tables", () => {
    const pending: CalculationResult = { ...base, homeActualGoals: 2, awayActualGoals: 1, homeBonusGoals: 0, awayBonusGoals: 0, status: "SUBMITTED" };
    expect(calculateUnofficialStandings(players, [pending], [])[0].played).toBe(1);
    expect(calculateOfficialStandings(players, [pending], [])[0].played).toBe(0);
    expect(calculateOfficialStandings(players, [{ ...pending, status: "APPROVED" }], [])[0].played).toBe(1);
  });
  it("applies penalties to points only", () => {
    const result: CalculationResult = { ...base, homeActualGoals: 1, awayActualGoals: 0, homeBonusGoals: 0, awayBonusGoals: 0, status: "APPROVED" };
    const row = calculateOfficialStandings(players, [result], [{ playerId: "a", adjustment: -3, reversed: false }]).find((item) => item.player_id === "a");
    expect(row).toMatchObject({ played: 1, won: 1, goals_for: 1, earned_points: 3, penalty_adjustment: -3, points: 0 });
  });
  it("uses table outcome and actual goals for stats and H2H", () => {
    const result: CalculationResult = { ...base, homeActualGoals: 2, awayActualGoals: 2, homeBonusGoals: 3, awayBonusGoals: 0, status: "APPROVED" };
    expect(calculatePlayerStatistics("a", [result])).toMatchObject({ wins: 1, actual_goals_scored: 2, goals_conceded: 2 });
    expect(calculateHeadToHead("a", "b", [result])).toMatchObject({ matchesPlayed: 1, playerAWins: 1, playerAActualGoals: 2, playerBActualGoals: 2 });
  });
  it("excludes rejected records", () => {
    const rejected: CalculationResult = { ...base, homeActualGoals: 9, awayActualGoals: 0, homeBonusGoals: 0, awayBonusGoals: 0, status: "REJECTED" };
    expect(calculateUnofficialStandings(players, [rejected], []).every((row) => row.played === 0)).toBe(true);
  });
});

