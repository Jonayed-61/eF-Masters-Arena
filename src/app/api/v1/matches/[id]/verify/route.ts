import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MatchStatus } from "@prisma/client";
import { advanceKnockoutWinnerEngine, updateGroupStandings, checkAndUnlockAchievements } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";
import { requireTournamentModerator } from "@/lib/permissions";
import { AppError, handleApiError } from "@/lib/api-response";
import { matchVerificationSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { player1Score: p1Score, player2Score: p2Score } = matchVerificationSchema.parse(await req.json());

    const match = await db.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match || !match.player1Id || !match.player2Id) {
      return NextResponse.json({ error: "Match not found or incomplete players" }, { status: 400 });
    }
    const user = await requireTournamentModerator(match.tournamentId);
    const player1Id = match.player1Id;
    const player2Id = match.player2Id;
    if (match.status === MatchStatus.CONFIRMED) return NextResponse.json({ success: true, message: "This match was already verified.", match });
    if (!new Set<MatchStatus>([MatchStatus.RESULT_SUBMITTED, MatchStatus.UNDER_REVIEW, MatchStatus.DISPUTED]).has(match.status)) {
      return NextResponse.json({ error: "This match has no result waiting for verification" }, { status: 409 });
    }
    if (!match.groupId && p1Score === p2Score) throw new AppError("KNOCKOUT_DRAW", "Knockout matches require a winner.", 400);

    let winnerId = null;
    if (p1Score > p2Score) winnerId = match.player1Id;
    else if (p2Score > p1Score) winnerId = match.player2Id;

    const isDraw = p1Score === p2Score;
    const verification = await db.$transaction(async (tx) => {
      const current = await tx.match.findUnique({ where: { id: match.id } });
      if (!current) throw new AppError("MATCH_NOT_FOUND", "Match not found.", 404);
      if (current.status === MatchStatus.CONFIRMED) return { updated: current, statsApplied: false };
      if (current.statsAppliedAt) throw new AppError("RESULT_ALREADY_APPLIED", "This result has already affected player statistics.", 409);

      const updated = await tx.match.update({
        where: { id: match.id },
        data: {
          player1Score: p1Score,
          player2Score: p2Score,
          winnerId,
          status: MatchStatus.CONFIRMED,
          verifiedById: user.id,
          verifiedAt: new Date(),
          statsAppliedAt: new Date(),
        },
      });

      await tx.matchSubmission.updateMany({
        where: { matchId: match.id },
        data: { isVerified: true },
      });

      await tx.profile.update({
        where: { userId: player1Id },
        data: {
          matchesPlayed: { increment: 1 },
          goalsFor: { increment: p1Score },
          goalsAgainst: { increment: p2Score },
          ...(winnerId === player1Id && { matchesWon: { increment: 1 } }),
          ...(isDraw && { matchesDrawn: { increment: 1 } }),
          ...(winnerId !== player1Id && !isDraw && { matchesLost: { increment: 1 } }),
        },
      });
      await tx.profile.update({
        where: { userId: player2Id },
        data: {
          matchesPlayed: { increment: 1 },
          goalsFor: { increment: p2Score },
          goalsAgainst: { increment: p1Score },
          ...(winnerId === player2Id && { matchesWon: { increment: 1 } }),
          ...(isDraw && { matchesDrawn: { increment: 1 } }),
          ...(winnerId !== player2Id && !isDraw && { matchesLost: { increment: 1 } }),
        },
      });

      await tx.notification.createMany({ data: [
        { userId: player1Id, title: "Match result verified", message: `Your ${match.roundName} result was verified.`, link: `/tournaments/${match.tournament.slug}` },
        { userId: player2Id, title: "Match result verified", message: `Your ${match.roundName} result was verified.`, link: `/tournaments/${match.tournament.slug}` },
      ] });
      return { updated, statsApplied: true };
    });

    if (verification.statsApplied) {
      await checkAndUnlockAchievements(player1Id);
      await checkAndUnlockAchievements(player2Id);
    }

    // If this match is in a group, update group standings
    if (match.groupId) {
      await updateGroupStandings(match.groupId);
    }

    // If this match is in a knockout bracket, advance winner to next bracket round
    if (match.bracketNodeId || match.roundName !== "Group Stage") {
      await advanceKnockoutWinnerEngine(match.id);
    }

    await logAudit({
      userId: user.id,
      action: "MATCH_VERIFIED",
      entity: "Match",
      entityId: match.id,
      newValue: { score: `${p1Score} - ${p2Score}`, winnerId },
    });

    return NextResponse.json({
      success: true,
      message: "Match result verified and standings/bracket updated!",
      match: verification.updated,
    });
  } catch (err: unknown) {
    return handleApiError(err, "Match result could not be verified.");
  }
}
