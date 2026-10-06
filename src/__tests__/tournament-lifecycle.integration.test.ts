import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { DisputeStatus, MatchStatus, PaymentStatus, RegistrationStatus, Role, TournamentStatus } from "@prisma/client";
import { AppError } from "../lib/api-response";

const templateDatabase = path.join(process.cwd(), "prisma", "dev.db");
const testDatabase = path.join(process.cwd(), "prisma", "test.db");
rmSync(testDatabase, { force: true });
copyFileSync(templateDatabase, testDatabase);
process.env.DATABASE_URL = "file:./test.db";

let db: Awaited<typeof import("../lib/db")>["db"];
let engine: typeof import("../lib/tournament-engine");
let payments: typeof import("../lib/payments");
let disputes: typeof import("../lib/disputes");

before(async () => {
  ({ db } = await import("../lib/db"));
  engine = await import("../lib/tournament-engine");
  payments = await import("../lib/payments");
  disputes = await import("../lib/disputes");
});

function hasAppErrorCode(code: string) {
  return (error: unknown) => error instanceof AppError && error.code === code;
}

test("database prevents duplicate tournament registration", async () => {
  const owner = await db.user.create({ data: { email: "registration-owner@test.invalid", passwordHash: "not-used", role: Role.TOURNAMENT_ADMIN, profile: { create: { fullName: "Registration Owner", username: "registration_owner", efootballId: "registration-owner-id", efootballIgn: "reg-owner", teamName: "Admin", whatsappNumber: "none" } } } });
  const player = await db.user.create({ data: { email: "registration-player@test.invalid", passwordHash: "not-used", profile: { create: { fullName: "Registration Player", username: "registration_player", efootballId: "registration-player-id", efootballIgn: "reg-player", teamName: "Test", whatsappNumber: "none" } } } });
  const tournament = await db.tournament.create({ data: { name: "Registration Cup", slug: "registration-cup", description: "Tournament used for registration constraint testing.", registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-02"), tournamentStart: new Date("2026-01-03"), status: TournamentStatus.REGISTRATION_OPEN, createdById: owner.id } });
  await db.registration.create({ data: { tournamentId: tournament.id, userId: player.id, finalFee: 0, status: RegistrationStatus.APPROVED } });
  await assert.rejects(() => db.registration.create({ data: { tournamentId: tournament.id, userId: player.id, finalFee: 0, status: RegistrationStatus.APPROVED } }));
  assert.equal(await db.registration.count({ where: { tournamentId: tournament.id, userId: player.id } }), 1);
});

test("payment proof submission is validated, update-safe, and transaction IDs are unique", async () => {
  const owner = await db.user.create({ data: { email: "proof-owner@test.invalid", passwordHash: "not-used", role: Role.TOURNAMENT_ADMIN, profile: { create: { fullName: "Proof Owner", username: "proof_owner", efootballId: "proof-owner-id", efootballIgn: "proof-owner", teamName: "Admin", whatsappNumber: "none" } } } });
  const tournament = await db.tournament.create({ data: { name: "Proof Cup", slug: "proof-cup", description: "Tournament used for payment proof testing.", registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-02"), tournamentStart: new Date("2026-01-03"), totalSlots: 4, entryFee: 100, paymentInstructions: "Test instructions", status: TournamentStatus.REGISTRATION_OPEN, createdById: owner.id } });
  const players: Array<{ id: string }> = [];
  for (let index = 1; index <= 2; index += 1) {
    players.push(await db.user.create({ data: { email: `proof-player-${index}@test.invalid`, passwordHash: "not-used", profile: { create: { fullName: `Proof Player ${index}`, username: `proof_player_${index}`, efootballId: `proof-player-id-${index}`, efootballIgn: `proof-${index}`, teamName: "Test", whatsappNumber: "none" } } } }));
    await db.registration.create({ data: { tournamentId: tournament.id, userId: players[index - 1].id, finalFee: 100, status: RegistrationStatus.PENDING_PAYMENT } });
  }
  const proof = { method: "bKash", senderNumber: "01700000000", transactionId: "PROOF-TRX-1", amount: 100, screenshot: "/uploads/payment-images/00000000-0000-4000-8000-000000000001.png" };
  const first = await payments.submitPaymentProof(tournament.slug, players[0].id, proof);
  const retry = await payments.submitPaymentProof(tournament.slug, players[0].id, proof);
  assert.equal(first.id, retry.id);
  assert.equal(await db.payment.count({ where: { registration: { tournamentId: tournament.id, userId: players[0].id } } }), 1);
  assert.equal((await db.registration.findUniqueOrThrow({ where: { tournamentId_userId: { tournamentId: tournament.id, userId: players[0].id } } })).status, RegistrationStatus.UNDER_REVIEW);
  await assert.rejects(() => payments.submitPaymentProof(tournament.slug, players[1].id, proof), hasAppErrorCode("DUPLICATE_TRANSACTION"));
  await assert.rejects(() => payments.submitPaymentProof(tournament.slug, players[1].id, { ...proof, transactionId: "PROOF-TRX-2", amount: 99 }), hasAppErrorCode("PAYMENT_AMOUNT_MISMATCH"));
});

test("payment approval and rejection are transactional and retry-safe", async () => {
  const owner = await db.user.create({ data: { email: "payment-owner@test.invalid", passwordHash: "not-used", role: Role.TOURNAMENT_ADMIN, profile: { create: { fullName: "Payment Owner", username: "payment_owner", efootballId: "payment-owner-id", efootballIgn: "owner", teamName: "Admin", whatsappNumber: "none" } } } });
  const tournament = await db.tournament.create({ data: { name: "Payment Cup", slug: "payment-cup", description: "Tournament used for payment workflow testing.", registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-02"), tournamentStart: new Date("2026-01-03"), totalSlots: 4, entryFee: 100, paymentInstructions: "Test instructions", status: TournamentStatus.REGISTRATION_OPEN, createdById: owner.id } });
  const createPayment = async (suffix: string) => {
    const player = await db.user.create({ data: { email: `payment-${suffix}@test.invalid`, passwordHash: "not-used", profile: { create: { fullName: `Payment ${suffix}`, username: `payment_${suffix}`, efootballId: `payment-id-${suffix}`, efootballIgn: suffix, teamName: "Test", whatsappNumber: "none" } } } });
    const registration = await db.registration.create({ data: { tournamentId: tournament.id, userId: player.id, status: RegistrationStatus.UNDER_REVIEW, finalFee: 100 } });
    const payment = await db.payment.create({ data: { registrationId: registration.id, userId: player.id, method: "bKash", senderNumber: "01700000000", transactionId: `TRX-${suffix}`, amount: 100, screenshot: "/proof.png", status: PaymentStatus.UNDER_REVIEW } });
    return { player, registration, payment };
  };
  const approved = await createPayment("approved");
  await payments.approvePayment(approved.payment.id, owner.id);
  await payments.approvePayment(approved.payment.id, owner.id);
  assert.equal(await db.tournamentParticipant.count({ where: { tournamentId: tournament.id, userId: approved.player.id } }), 1);
  assert.equal((await db.registration.findUniqueOrThrow({ where: { id: approved.registration.id } })).status, RegistrationStatus.APPROVED);
  const rejected = await createPayment("rejected");
  await payments.rejectPayment(rejected.payment.id, owner.id, "Reference could not be verified");
  assert.equal((await db.payment.findUniqueOrThrow({ where: { id: rejected.payment.id } })).status, PaymentStatus.REJECTED);
  assert.equal(await db.tournamentParticipant.count({ where: { tournamentId: tournament.id, userId: rejected.player.id } }), 0);
});

test("group generation includes only approved players without duplicates", async () => {
  const owner = await db.user.create({ data: { email: "groups-owner@test.invalid", passwordHash: "not-used", role: Role.TOURNAMENT_ADMIN, profile: { create: { fullName: "Groups Owner", username: "groups_owner", efootballId: "groups-owner-id", efootballIgn: "groups-owner", teamName: "Admin", whatsappNumber: "none" } } } });
  const tournament = await db.tournament.create({ data: { name: "Groups Cup", slug: "groups-cup", description: "Tournament used for group allocation testing.", registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-02"), tournamentStart: new Date("2026-01-03"), totalSlots: 8, minimumParticipants: 2, groupCount: 2, status: TournamentStatus.REGISTRATION_CLOSED, createdById: owner.id } });
  const approvedIds: string[] = [];
  let pendingId = "";
  for (let index = 1; index <= 5; index += 1) {
    const player = await db.user.create({ data: { email: `groups-player-${index}@test.invalid`, passwordHash: "not-used", profile: { create: { fullName: `Groups Player ${index}`, username: `groups_player_${index}`, efootballId: `groups-player-id-${index}`, efootballIgn: `groups-${index}`, teamName: "Test", whatsappNumber: "none" } } } });
    const approved = index <= 4;
    if (approved) approvedIds.push(player.id); else pendingId = player.id;
    await db.registration.create({ data: { tournamentId: tournament.id, userId: player.id, finalFee: approved ? 0 : 100, status: approved ? RegistrationStatus.APPROVED : RegistrationStatus.PENDING_PAYMENT } });
  }
  const generated = await engine.generateGroupsEngine(tournament.id, 2);
  const retry = await engine.generateGroupsEngine(tournament.id, 2);
  const members = await db.groupMember.findMany({ where: { group: { tournamentId: tournament.id } }, include: { participant: true } });
  assert.equal(generated.length, 2);
  assert.equal(retry.length, 2);
  assert.equal(members.length, 4);
  assert.equal(new Set(members.map((member) => member.participant.userId)).size, 4);
  assert.deepEqual(new Set(members.map((member) => member.participant.userId)), new Set(approvedIds));
  assert.equal(members.some((member) => member.participant.userId === pendingId), false);
});

test("disputes enforce participation and resolve with moderator metadata", async () => {
  const owner = await db.user.create({ data: { email: "dispute-owner@test.invalid", passwordHash: "not-used", role: Role.TOURNAMENT_ADMIN, profile: { create: { fullName: "Dispute Owner", username: "dispute_owner", efootballId: "dispute-owner-id", efootballIgn: "dispute-owner", teamName: "Admin", whatsappNumber: "none" } } } });
  const player1 = await db.user.create({ data: { email: "dispute-player-1@test.invalid", passwordHash: "not-used", profile: { create: { fullName: "Dispute Player 1", username: "dispute_player_1", efootballId: "dispute-player-id-1", efootballIgn: "dp1", teamName: "Test", whatsappNumber: "none" } } } });
  const player2 = await db.user.create({ data: { email: "dispute-player-2@test.invalid", passwordHash: "not-used", profile: { create: { fullName: "Dispute Player 2", username: "dispute_player_2", efootballId: "dispute-player-id-2", efootballIgn: "dp2", teamName: "Test", whatsappNumber: "none" } } } });
  const outsider = await db.user.create({ data: { email: "dispute-outsider@test.invalid", passwordHash: "not-used", profile: { create: { fullName: "Dispute Outsider", username: "dispute_outsider", efootballId: "dispute-outsider-id", efootballIgn: "outsider", teamName: "Test", whatsappNumber: "none" } } } });
  const tournament = await db.tournament.create({ data: { name: "Dispute Cup", slug: "dispute-cup", description: "Tournament used for dispute workflow testing.", registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-02"), tournamentStart: new Date("2026-01-03"), status: TournamentStatus.GROUP_STAGE, createdById: owner.id } });
  const match = await db.match.create({ data: { tournamentId: tournament.id, roundName: "Group A", player1Id: player1.id, player2Id: player2.id, status: MatchStatus.RESULT_SUBMITTED } });
  const input = { matchId: match.id, reportedPlayerId: player2.id, reason: "Conflicting score", description: "The submitted result does not match the screenshot.", evidenceUrl: "/uploads/dispute-images/00000000-0000-4000-8000-000000000002.png" };
  const dispute = await disputes.createMatchDispute(player1.id, input);
  assert.equal(dispute.evidence.length, 1);
  assert.equal((await db.match.findUniqueOrThrow({ where: { id: match.id } })).status, MatchStatus.DISPUTED);
  await assert.rejects(() => disputes.createMatchDispute(outsider.id, { ...input, reportedPlayerId: player1.id }), hasAppErrorCode("FORBIDDEN"));
  await assert.rejects(() => disputes.createMatchDispute(player1.id, input), hasAppErrorCode("DUPLICATE_DISPUTE"));
  const resolved = await disputes.resolveMatchDispute(dispute.id, owner.id, { status: DisputeStatus.RESOLVED, adminDecision: "Evidence accepted", adminNotes: "Verify the corrected score." });
  assert.equal(resolved.resolvedById, owner.id);
  assert.ok(resolved.resolvedAt);
  assert.equal((await db.match.findUniqueOrThrow({ where: { id: match.id } })).status, MatchStatus.UNDER_REVIEW);
  await assert.rejects(() => disputes.resolveMatchDispute(dispute.id, owner.id, { status: DisputeStatus.REJECTED, adminDecision: "Second decision" }), hasAppErrorCode("DISPUTE_ALREADY_RESOLVED"));
});

test("deterministic eight-player lifecycle completes once", async () => {
  const owner = await db.user.create({ data: { email: "owner@test.invalid", passwordHash: "not-used", role: Role.TOURNAMENT_ADMIN, profile: { create: { fullName: "Owner", username: "owner", efootballId: "owner-id", efootballIgn: "owner", teamName: "Admin", whatsappNumber: "none" } } } });
  const players = [];
  for (let index = 1; index <= 8; index += 1) {
    players.push(await db.user.create({ data: { email: `player${index}@test.invalid`, passwordHash: "not-used", profile: { create: { fullName: `Player ${index}`, username: `player${index}`, efootballId: `player-id-${index}`, efootballIgn: `P${index}`, teamName: `Team ${index}`, whatsappNumber: "none" } } } }));
  }
  await db.achievement.create({ data: { code: "FIRST_CHAMPION", title: "First champion", description: "Win a tournament", icon: "trophy", points: 100 } });
  const tournament = await db.tournament.create({ data: { name: "Integration Cup", slug: "integration-cup", description: "Deterministic lifecycle integration tournament.", registrationStart: new Date("2026-01-01"), registrationEnd: new Date("2026-01-02"), tournamentStart: new Date("2026-01-03"), totalSlots: 8, minimumParticipants: 8, groupCount: 4, qualifiersPerGroup: 2, status: TournamentStatus.REGISTRATION_CLOSED, createdById: owner.id } });
  for (const player of players) {
    await db.registration.create({ data: { tournamentId: tournament.id, userId: player.id, status: RegistrationStatus.APPROVED, finalFee: 0 } });
  }

  const groups = await engine.generateGroupsEngine(tournament.id, 4);
  assert.equal(groups.length, 4);
  assert.equal(await db.groupMember.count({ where: { group: { tournamentId: tournament.id } } }), 8);
  const fixtures = await engine.generateGroupFixturesEngine(tournament.id);
  assert.equal(fixtures.length, 4);
  assert.equal((await engine.generateGroupFixturesEngine(tournament.id)).length, 4, "fixture retries are idempotent");
  for (const match of fixtures) {
    await db.match.update({ where: { id: match.id }, data: { player1Score: 1, player2Score: 0, winnerId: match.player1Id, status: MatchStatus.CONFIRMED } });
    await engine.updateGroupStandings(match.groupId!);
  }

  await engine.generateKnockoutBracketEngine(tournament.id, 2);
  assert.equal(await db.bracketNode.count({ where: { tournamentId: tournament.id } }), 7);
  const quarterFinals = await db.match.findMany({ where: { tournamentId: tournament.id, roundName: "Quarter Final" } });
  const qualifierIds = quarterFinals.flatMap((match) => [match.player1Id, match.player2Id]).filter((id): id is string => Boolean(id));
  assert.equal(qualifierIds.length, 8);
  assert.equal(new Set(qualifierIds).size, 8);
  for (const roundName of ["Quarter Final", "Semi Final"] as const) {
    const matches = await db.match.findMany({ where: { tournamentId: tournament.id, roundName }, orderBy: { matchNumber: "asc" } });
    for (const match of matches) {
      assert.ok(match.player1Id && match.player2Id);
      await db.match.update({ where: { id: match.id }, data: { player1Score: 2, player2Score: 0, winnerId: match.player1Id, status: MatchStatus.CONFIRMED } });
      await engine.advanceKnockoutWinnerEngine(match.id);
      await engine.advanceKnockoutWinnerEngine(match.id);
    }
  }
  const final = await db.match.findFirstOrThrow({ where: { tournamentId: tournament.id, roundName: "Final" } });
  assert.ok(final.player1Id && final.player2Id);
  await db.match.update({ where: { id: final.id }, data: { player1Score: 3, player2Score: 1, winnerId: final.player1Id, status: MatchStatus.CONFIRMED } });
  const first = await engine.finalizeTournamentEngine(tournament.id, final.player1Id!, final.player2Id!);
  const second = await engine.finalizeTournamentEngine(tournament.id, final.player1Id!, final.player2Id!);
  assert.equal(first.id, second.id);
  assert.equal(await db.hallOfFame.count({ where: { tournamentId: tournament.id } }), 1);
  const champion = await db.profile.findUniqueOrThrow({ where: { userId: final.player1Id! } });
  assert.equal(champion.championships, 1);
  assert.equal(champion.rankingPoints, 100);
  assert.equal(await db.playerAchievement.count({ where: { userId: final.player1Id! } }), 1);
  assert.equal((await db.tournament.findUniqueOrThrow({ where: { id: tournament.id } })).status, TournamentStatus.COMPLETED);
});

after(async () => {
  await db.$disconnect();
  rmSync(testDatabase, { force: true });
});
