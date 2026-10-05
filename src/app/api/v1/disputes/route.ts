import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { disputeSubmissionSchema } from "@/lib/validators";
import { MatchStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await requireAuth();

    let disputes;
    if (user.role === "SUPER_ADMIN" || user.role === "MODERATOR") {
      disputes = await db.dispute.findMany({
        include: {
          match: { include: { tournament: true } },
          reporter: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          evidence: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "TOURNAMENT_ADMIN") {
      disputes = await db.dispute.findMany({
        where: { match: { tournament: { createdById: user.id } } },
        include: {
          match: { include: { tournament: true } },
          reporter: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          evidence: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      disputes = await db.dispute.findMany({
        where: {
          OR: [{ reporterId: user.id }, { reportedPlayerId: user.id }],
        },
        include: {
          match: { include: { tournament: true } },
          reporter: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          evidence: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, disputes });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch disputes";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const val = disputeSubmissionSchema.parse(body);

    const match = await db.match.findUnique({ where: { id: val.matchId } });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    const opponentId = match.player1Id === user.id ? match.player2Id : match.player2Id === user.id ? match.player1Id : null;
    if (!opponentId || opponentId !== val.reportedPlayerId) {
      return NextResponse.json({ error: "Only a match participant can report their opponent." }, { status: 403 });
    }
    if (match.status !== MatchStatus.RESULT_SUBMITTED && match.status !== MatchStatus.UNDER_REVIEW && match.status !== MatchStatus.CONFIRMED) {
      return NextResponse.json({ error: "This match is not in a state that can be disputed." }, { status: 409 });
    }

    const dispute = await db.$transaction(async (tx) => {
      const existing = await tx.dispute.findFirst({
        where: { matchId: match.id, reporterId: user.id, status: { in: ["OPEN", "UNDER_REVIEW"] } },
        select: { id: true },
      });
      if (existing) throw new Error("You already have an active dispute for this match.");
      const created = await tx.dispute.create({
        data: {
          matchId: val.matchId,
          reporterId: user.id,
          reportedPlayerId: val.reportedPlayerId,
          reason: val.reason,
          description: val.description,
          ...(val.evidenceUrl && {
            evidence: { create: { fileUrl: val.evidenceUrl, fileType: "image" } },
          }),
        },
        include: { evidence: true },
      });
      await tx.match.update({ where: { id: val.matchId }, data: { status: MatchStatus.DISPUTED } });
      return created;
    });

    return NextResponse.json({ success: true, message: "Dispute reported to admins", dispute });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to file dispute";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
