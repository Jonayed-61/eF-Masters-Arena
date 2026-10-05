import { NextResponse } from "next/server";
import { MatchStatus, Role } from "@prisma/client";
import { canManageTournament, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { finalizeTournamentEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const admin = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const { slug } = await params;
    const tournament = await db.tournament.findUnique({ where: { slug } });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (!(await canManageTournament(admin, tournament.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const finalMatch = await db.match.findFirst({
      where: { tournamentId: tournament.id, roundName: "Final" },
      orderBy: { updatedAt: "desc" },
    });
    if (!finalMatch || finalMatch.status !== MatchStatus.CONFIRMED || !finalMatch.winnerId) {
      return NextResponse.json({ error: "The final match must be confirmed before completing the tournament." }, { status: 409 });
    }

    const runnerUpId = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
    if (!runnerUpId) {
      return NextResponse.json({ error: "The final match must have two players." }, { status: 409 });
    }

    const thirdPlaceMatch = await db.match.findFirst({
      where: { tournamentId: tournament.id, roundName: "3rd Place", status: MatchStatus.CONFIRMED },
    });
    const thirdPlaceId = thirdPlaceMatch?.winnerId ?? undefined;
    const hallOfFame = await finalizeTournamentEngine(tournament.id, finalMatch.winnerId, runnerUpId, thirdPlaceId);

    await logAudit({
      userId: admin.id,
      action: "TOURNAMENT_COMPLETED",
      entity: "Tournament",
      entityId: tournament.id,
      prevValue: { status: tournament.status },
      newValue: { status: "COMPLETED", championId: finalMatch.winnerId, runnerUpId, thirdPlaceId },
    });

    return NextResponse.json({ success: true, message: "Tournament completed and Hall of Fame updated.", hallOfFame });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to complete tournament";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}