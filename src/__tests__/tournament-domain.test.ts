import assert from "node:assert/strict";
import { test } from "node:test";
import { MatchStatus, Role, TournamentStatus } from "@prisma/client";
import { AppError } from "../lib/api-response";
import { canManageOwnedTournament, canModerateTournament } from "../lib/permissions";
import { getDashboardCapabilities } from "../lib/dashboard";
import { calculateAvailableSlots, calculateStandings, createRoundRobinPairs } from "../lib/tournament/calculations";
import { assertMatchCanAcceptSubmission, assertRegistrationAllowed, assertTournamentTransition } from "../lib/tournament/lifecycle";

test("slot calculations clamp capacity at zero", () => {
  assert.deepEqual(calculateAvailableSlots(32, 12), { availableSlots: 20, isFull: false });
  assert.deepEqual(calculateAvailableSlots(32, 32), { availableSlots: 0, isFull: true });
  assert.deepEqual(calculateAvailableSlots(32, 35), { availableSlots: 0, isFull: true });
});

test("registration accepts a valid open tournament", () => {
  assert.doesNotThrow(() => assertRegistrationAllowed({ status: TournamentStatus.REGISTRATION_OPEN, registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-31"), now: new Date("2026-01-15"), confirmedCount: 7, totalSlots: 8, isBanned: false }));
});

for (const [name, overrides, code] of [
  ["closed registration", { status: TournamentStatus.REGISTRATION_CLOSED }, "REGISTRATION_CLOSED"],
  ["full tournament", { confirmedCount: 8 }, "TOURNAMENT_FULL"],
  ["banned player", { isBanned: true }, "ACCOUNT_BANNED"],
] as const) {
  test(`registration rejects ${name}`, () => {
    const validInput = { status: TournamentStatus.REGISTRATION_OPEN, registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-31"), now: new Date("2026-01-15"), confirmedCount: 7, totalSlots: 8, isBanned: false };
    assert.throws(() => assertRegistrationAllowed({ ...validInput, ...overrides }), (error: unknown) => error instanceof AppError && error.code === code);
  });
}

test("role ownership rules distinguish every role", () => {
  assert.equal(canManageOwnedTournament({ id: "root", role: Role.SUPER_ADMIN }, "other"), true);
  assert.equal(canManageOwnedTournament({ id: "owner", role: Role.TOURNAMENT_ADMIN }, "owner"), true);
  assert.equal(canManageOwnedTournament({ id: "admin-2", role: Role.TOURNAMENT_ADMIN }, "owner"), false);
  assert.equal(canManageOwnedTournament({ id: "moderator", role: Role.MODERATOR }, "moderator"), false);
  assert.equal(canManageOwnedTournament({ id: "player", role: Role.PLAYER }, "player"), false);
});

test("moderation rules allow global moderators and only the owning tournament admin", () => {
  assert.equal(canModerateTournament({ id: "root", role: Role.SUPER_ADMIN }, "other"), true);
  assert.equal(canModerateTournament({ id: "moderator", role: Role.MODERATOR }, "other"), true);
  assert.equal(canModerateTournament({ id: "owner", role: Role.TOURNAMENT_ADMIN }, "owner"), true);
  assert.equal(canModerateTournament({ id: "admin-2", role: Role.TOURNAMENT_ADMIN }, "owner"), false);
  assert.equal(canModerateTournament({ id: "player", role: Role.PLAYER }, "player"), false);
});

test("dashboard capability matrix keeps platform controls super-admin only", () => {
  assert.deepEqual(getDashboardCapabilities(Role.PLAYER), { playerWorkspace: true, moderation: false, tournamentManagement: false, platformManagement: false });
  assert.deepEqual(getDashboardCapabilities(Role.MODERATOR), { playerWorkspace: false, moderation: true, tournamentManagement: false, platformManagement: false });
  assert.deepEqual(getDashboardCapabilities(Role.TOURNAMENT_ADMIN), { playerWorkspace: false, moderation: true, tournamentManagement: true, platformManagement: false });
  assert.deepEqual(getDashboardCapabilities(Role.SUPER_ADMIN), { playerWorkspace: false, moderation: true, tournamentManagement: true, platformManagement: true });
});

test("round-robin pairs contain every opponent exactly once", () => {
  const pairs = createRoundRobinPairs(["a", "b", "c", "d"]);
  assert.equal(pairs.length, 6);
  assert.equal(new Set(pairs.map(([a, b]) => [a, b].sort().join(":"))).size, 6);
  assert.ok(pairs.every(([a, b]) => a !== b));
});

test("standings calculate wins, draws, losses, goal difference and deterministic ties", () => {
  const table = calculateStandings(["a", "b", "c"], [
    { player1Id: "a", player2Id: "b", player1Score: 2, player2Score: 0 },
    { player1Id: "a", player2Id: "c", player1Score: 1, player2Score: 1 },
    { player1Id: "b", player2Id: "c", player1Score: 3, player2Score: 1 },
  ]);
  assert.deepEqual(table.map(({ userId, points, goalDiff, played, won, drawn, lost }) => ({ userId, points, goalDiff, played, won, drawn, lost })), [
    { userId: "a", points: 4, goalDiff: 2, played: 2, won: 1, drawn: 1, lost: 0 },
    { userId: "b", points: 3, goalDiff: 0, played: 2, won: 1, drawn: 0, lost: 1 },
    { userId: "c", points: 1, goalDiff: -2, played: 2, won: 0, drawn: 1, lost: 1 },
  ]);
});

test("lifecycle blocks unsafe transitions and ineligible result states", () => {
  assert.doesNotThrow(() => assertTournamentTransition(TournamentStatus.DRAFT, TournamentStatus.REGISTRATION_OPEN));
  assert.throws(() => assertTournamentTransition(TournamentStatus.COMPLETED, TournamentStatus.REGISTRATION_OPEN), AppError);
  assert.doesNotThrow(() => assertMatchCanAcceptSubmission(MatchStatus.SCHEDULED));
  assert.throws(() => assertMatchCanAcceptSubmission(MatchStatus.CONFIRMED), AppError);
});

