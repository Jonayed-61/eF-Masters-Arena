import { DisputeStatus, MatchStatus, Prisma } from "@prisma/client";
import { AppError } from "./api-response";
import { db } from "./db";

export type DisputeSubmissionInput = {
  matchId: string;
  reportedPlayerId: string;
  reason: string;
  description: string;
  evidenceUrl?: string;
};

export type DisputeResolutionInput = {
  status: "RESOLVED" | "REJECTED";
  adminDecision: string;
  adminNotes?: string;
};

export async function createMatchDispute(reporterId: string, input: DisputeSubmissionInput) {
  const match = await db.match.findUnique({ where: { id: input.matchId } });
  if (!match) throw new AppError("MATCH_NOT_FOUND", "Match not found.", 404);
  const opponentId = match.player1Id === reporterId ? match.player2Id : match.player2Id === reporterId ? match.player1Id : null;
  if (!opponentId || opponentId !== input.reportedPlayerId) {
    throw new AppError("FORBIDDEN", "Only a match participant can report their opponent.", 403);
  }
  const existing = await db.dispute.findUnique({
    where: { matchId_reporterId: { matchId: match.id, reporterId } },
    select: { id: true },
  });
  if (existing) throw new AppError("DUPLICATE_DISPUTE", "You already filed a dispute for this match.", 409);
  if (match.status !== MatchStatus.RESULT_SUBMITTED && match.status !== MatchStatus.UNDER_REVIEW) {
    throw new AppError("MATCH_NOT_DISPUTABLE", "This match is not in a state that can be disputed.", 409);
  }

  return db.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({
      data: {
        matchId: input.matchId,
        reporterId,
        reportedPlayerId: input.reportedPlayerId,
        reason: input.reason,
        description: input.description,
        ...(input.evidenceUrl && { evidence: { create: { fileUrl: input.evidenceUrl, fileType: "image" } } }),
      },
      include: { evidence: true },
    });
    await tx.match.update({ where: { id: input.matchId }, data: { status: MatchStatus.DISPUTED } });
    const tournament = await tx.tournament.findUniqueOrThrow({ where: { id: match.tournamentId }, select: { createdById: true } });
    await tx.notification.create({
      data: { userId: tournament.createdById, title: "Dispute opened", message: "A match dispute requires review.", link: "/disputes" },
    });
    return dispute;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resolveMatchDispute(disputeId: string, resolverId: string, input: DisputeResolutionInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.dispute.findUnique({ where: { id: disputeId } });
    if (!existing) throw new AppError("DISPUTE_NOT_FOUND", "Dispute not found.", 404);
    if (existing.status === DisputeStatus.RESOLVED || existing.status === DisputeStatus.REJECTED) {
      throw new AppError("DISPUTE_ALREADY_RESOLVED", "This dispute has already been resolved.", 409);
    }
    const dispute = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: input.status,
        adminDecision: input.adminDecision,
        adminNotes: input.adminNotes || null,
        resolvedById: resolverId,
        resolvedAt: new Date(),
      },
      include: {
        reporter: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
        reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
      },
    });
    await tx.match.update({ where: { id: existing.matchId }, data: { status: MatchStatus.UNDER_REVIEW } });
    await tx.notification.createMany({
      data: [
        { userId: dispute.reporterId, title: "Dispute resolved", message: input.adminDecision, link: "/disputes" },
        { userId: dispute.reportedPlayerId, title: "Dispute resolved", message: input.adminDecision, link: "/disputes" },
      ],
    });
    return dispute;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
