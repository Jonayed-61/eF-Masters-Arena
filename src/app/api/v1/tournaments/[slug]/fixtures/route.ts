import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageTournament, requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { generateGroupFixturesEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const { slug } = await params;

    const tournament = await db.tournament.findUnique({ where: { slug } });
    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (!(await canManageTournament(user, tournament.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const matches = await generateGroupFixturesEngine(tournament.id);

    await logAudit({
      userId: user.id,
      action: "FIXTURES_GENERATED",
      entity: "Tournament",
      entityId: tournament.id,
      newValue: { matchesCount: matches.length },
    });

    return NextResponse.json({ success: true, message: `Generated ${matches.length} round robin matches`, matches });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate fixtures";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
