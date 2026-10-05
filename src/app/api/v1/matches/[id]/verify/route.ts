import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageTournament } from "@/lib/auth";
import { MatchStatus, Role } from "@prisma/client";
import { advanceKnockoutWinnerEngine, updateGroupStandings, checkAndUnlockAchievements } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN, Role.MODERATOR]);
    const { id } = await params;
    const body = await req.json();

    const p1Score = Number(body.player1Score);
    const p2Score = Number(body.player2Score);

    if (!Number.isInteger(p1Score) || !Number.isInteger(p2Score) || p1Score < 0 || p2Score < 0 || p1Score > 99 || p2Score > 99) {
      return NextResponse.json({ error: "Scores must be whole numbers between 0 and 99" }, { status: 400 });
    }

    const match = await db.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match || !match.player1Id || !match.player2Id) {
      return NextResponse.json({ error: "Match not found or incomplete players" }, { status: 400 });
    }
    const player1Id = match.player1Id;
    const player2Id = match.player2Id;
    if (match.status === MatchStatus.CONFIRMED) {
      return NextResponse.json({ error: "This match result has already been verified" }, { status: 409 });
    }
    if (match.status !== MatchStatus.RESULT_SUBMITTED && match.status !== MatchStatus.DISPUTED) {
      return NextResponse.json({ error: "This match has no result waiting for verification" }, { status: 409 });
    }
    if (user.role === Role.TOURNAMENT_ADMIN && !(await canManageTournament(user, match.tournamentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let winnerId = null;
    if (p1Score > p2Score) winnerId = match.player1Id;
    else if (p2Score > p1Score) winnerId = match.player2Id;

    const isDraw = p1Score === p2Score;
    const updatedMatch = await db.$transaction(async (tx) => {
      const current = await tx.match.findUnique({ where: { id: match.id } });
      if (!current || current.status === MatchStatus.CONFIRMED) {
        throw new Error("This match result has already been verified");
      }

      const updated = await tx.match.update({
        where: { id: match.id },
        data: {
          player1Score: p1Score,
          player2Score: p2Score,
          winnerId,
          status: MatchStatus.CONFIRMED,
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

      return updated;
    });

    await checkAndUnlockAchievements(player1Id);
    await checkAndUnlockAchievements(player2Id);

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
      match: updatedMatch,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "This match result has already been verified") {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const errorMsg = err instanceof Error ? err.message : "Failed to verify match";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
