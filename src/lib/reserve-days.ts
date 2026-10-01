import type { Fixture } from "./types";

export interface ReserveDayOption {
  id: string;
  reserve_date: string;
  active: boolean;
  max_matches_per_player: number;
}

export interface ReserveDayAvailability extends ReserveDayOption {
  homeMatchCount: number;
  awayMatchCount: number;
  available: boolean;
  unavailableReason: string | null;
}

export function calculateReserveDayAvailability(
  fixture: Fixture,
  fixtures: Fixture[],
  reserveDays: ReserveDayOption[],
): ReserveDayAvailability[] {
  return reserveDays.filter((day) => day.active).map((day) => {
    const fixturesOnDay = fixtures.filter((candidate) =>
      candidate.id !== fixture.id
      && candidate.match_date === day.reserve_date
      && candidate.status !== "CANCELLED",
    );
    const homeMatchCount = fixturesOnDay.filter((candidate) =>
      [candidate.home_player_id, candidate.away_player_id].includes(fixture.home_player_id),
    ).length;
    const awayMatchCount = fixturesOnDay.filter((candidate) =>
      [candidate.home_player_id, candidate.away_player_id].includes(fixture.away_player_id),
    ).length;
    const homeFull = homeMatchCount >= day.max_matches_per_player;
    const awayFull = awayMatchCount >= day.max_matches_per_player;
    const unavailableReason = homeFull && awayFull
      ? "Both players already have the maximum matches on this Reserve Day."
      : homeFull
        ? "Home Player already has 2 matches on this Reserve Day."
        : awayFull
          ? "Away Player already has 2 matches on this Reserve Day."
          : null;

    return {
      ...day,
      homeMatchCount,
      awayMatchCount,
      available: !homeFull && !awayFull,
      unavailableReason,
    };
  });
}
