import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { matchResultSubmissionSchema } from "@/lib/validators";
import { MatchStatus } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
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
    if (match.status !== MatchStatus.SCHEDULED && match.status !== MatchStatus.WAITING) {
      return NextResponse.json({ error: "This match is not accepting a result submission." }, { status: 409 });
    }

    const submission = await db.$transaction(async (tx) => {
      const existingSubmission = await tx.matchSubmission.findFirst({ where: { matchId: match.id } });
      if (existingSubmission) throw new Error("A result has already been submitted for this match.");
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
      await tx.match.update({ where: { id: match.id }, data: { status: MatchStatus.RESULT_SUBMITTED } });
      return created;
    });

    return NextResponse.json({
      success: true,
      message: "Match result submitted! Pending moderator/admin verification.",
      submission,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to submit result";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
