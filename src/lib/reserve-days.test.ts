import { describe, expect, it } from "vitest";
import type { Fixture } from "./types";
import { calculateReserveDayAvailability } from "./reserve-days";

const fixture = {
  id: "target",
  tournament_id: "tournament",
  matchweek: 1,
  home_player_id: "home",
  away_player_id: "away",
  match_date: "2026-09-30",
  status: "SCHEDULED",
  notes: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
} satisfies Fixture;

const reserveDays = [{ id: "reserve", reserve_date: "2026-10-11", active: true, max_matches_per_player: 2 }];

function scheduled(id: string, home: string, away: string): Fixture {
  return { ...fixture, id, home_player_id: home, away_player_id: away, match_date: "2026-10-11" };
}

describe("Reserve Day availability", () => {
  it("shows both player counts and allows a move below capacity", () => {
    const [option] = calculateReserveDayAvailability(fixture, [fixture, scheduled("one", "home", "other")], reserveDays);
    expect(option).toMatchObject({ homeMatchCount: 1, awayMatchCount: 0, available: true, unavailableReason: null });
  });

  it("disables a day when the Home Player already has two matches", () => {
    const [option] = calculateReserveDayAvailability(fixture, [
      fixture,
      scheduled("one", "home", "other-a"),
      scheduled("two", "other-b", "home"),
    ], reserveDays);
    expect(option).toMatchObject({ homeMatchCount: 2, awayMatchCount: 0, available: false });
    expect(option.unavailableReason).toContain("Home Player");
  });

  it("disables a day when the Away Player already has two matches", () => {
    const [option] = calculateReserveDayAvailability(fixture, [
      fixture,
      scheduled("one", "away", "other-a"),
      scheduled("two", "other-b", "away"),
    ], reserveDays);
    expect(option).toMatchObject({ homeMatchCount: 0, awayMatchCount: 2, available: false });
    expect(option.unavailableReason).toContain("Away Player");
  });

  it("ignores the target fixture and cancelled matches", () => {
    const movedTarget = { ...fixture, match_date: "2026-10-11", status: "RESCHEDULED" } satisfies Fixture;
    const cancelled = { ...scheduled("cancelled", "away", "other"), status: "CANCELLED" } satisfies Fixture;
    const [option] = calculateReserveDayAvailability(movedTarget, [movedTarget, cancelled], reserveDays);
    expect(option).toMatchObject({ homeMatchCount: 0, awayMatchCount: 0, available: true });
  });
});
