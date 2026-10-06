import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { matchResultSubmissionSchema } from "@/lib/validators";
import { MatchStatus, TournamentStatus } from "@prisma/client";
import { AppError, handleApiError } from "@/lib/api-response";
import { assertMatchCanAcceptSubmission } from "@/lib/tournament/lifecycle";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const val = matchResultSubmissionSchema.parse(body);

    const match = await db.match.findUnique({ where: { id }, include: { tournament: true } });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Verify player is part of match
    if (match.player1Id !== user.id && match.player2Id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You are not a player in this match." }, { status: 403 });
    }
    if (!new Set<TournamentStatus>([TournamentStatus.GROUP_STAGE, TournamentStatus.KNOCKOUT_STAGE, TournamentStatus.ONGOING]).has(match.tournament.status)) throw new AppError("INVALID_TOURNAMENT_PHASE", "This tournament is not accepting match results.", 409);
    assertMatchCanAcceptSubmission(match.status);

    const submission = await db.$transaction(async (tx) => {
      const existingSubmission = await tx.matchSubmission.findUnique({ where: { matchId_submitterId: { matchId: match.id, submitterId: user.id } } });
      if (existingSubmission) throw new AppError("DUPLICATE_SUBMISSION", "You already submitted a result for this match.", 409);
      const created = await tx.matchSubmission.create({
        data: {
          matchId: match.id,
          submitterId: user.id,
          playerScore: val.playerScore,
          opponentScore: val.opponentScore,
          screenshot: val.screenshot,
          notes: val.notes || null,
        },
      });
      const submissionCount = await tx.matchSubmission.count({ where: { matchId: match.id } });
      await tx.match.update({ where: { id: match.id }, data: { status: submissionCount >= 2 ? MatchStatus.UNDER_REVIEW : MatchStatus.RESULT_SUBMITTED } });
      await tx.notification.create({ data: { userId: match.tournament.createdById, title: "Match result submitted", message: `A result for ${match.tournament.name} requires review.`, link: "/dashboard" } });
      return created;
    });

    return NextResponse.json({
      success: true,
      message: "Match result submitted! Pending moderator/admin verification.",
      submission,
    });
  } catch (err: unknown) {
    return handleApiError(err, "Match result could not be submitted.");
  }
}
