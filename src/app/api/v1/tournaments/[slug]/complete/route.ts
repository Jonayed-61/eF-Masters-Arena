import { NextResponse } from "next/server";
import { MatchStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { finalizeTournamentEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tournament = await db.tournament.findUnique({ where: { slug } });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    const admin = await requireTournamentOwnerOrSuperAdmin(tournament.id);

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
    return handleApiError(err, "Tournament completion failed.");
  }
}
