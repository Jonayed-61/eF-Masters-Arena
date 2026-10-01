import { describe, expect, it } from "vitest";
import { resultSchema } from "./validation";

const fixtureId = "00000000-0000-4000-8000-000000000001";

describe("Opponent Left result validation", () => {
  it("accepts only the awarded Home Player's actual goals", () => {
    expect(resultSchema.safeParse({ fixtureId, resultType: "OPPONENT_LEFT", homeActualGoals: 5, awayActualGoals: 0, bonusSide: "HOME" }).success).toBe(true);
    expect(resultSchema.safeParse({ fixtureId, resultType: "OPPONENT_LEFT", homeActualGoals: 5, awayActualGoals: 1, bonusSide: "HOME" }).success).toBe(false);
  });

  it("accepts only the awarded Away Player's actual goals", () => {
    expect(resultSchema.safeParse({ fixtureId, resultType: "OPPONENT_LEFT", homeActualGoals: 0, awayActualGoals: 4, bonusSide: "AWAY" }).success).toBe(true);
    expect(resultSchema.safeParse({ fixtureId, resultType: "OPPONENT_LEFT", homeActualGoals: 2, awayActualGoals: 4, bonusSide: "AWAY" }).success).toBe(false);
  });
});
