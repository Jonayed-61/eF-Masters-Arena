import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageTournament, requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { generateKnockoutBracketEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const { slug } = await params;
    const body = await req.json();
    const topPerGroup = body.topPerGroup || 2;

    const tournament = await db.tournament.findUnique({ where: { slug } });
    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (!(await canManageTournament(user, tournament.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const bracketResult = await generateKnockoutBracketEngine(tournament.id, topPerGroup);

    await logAudit({
      userId: user.id,
      action: "BRACKET_GENERATED",
      entity: "Tournament",
      entityId: tournament.id,
      newValue: { topPerGroup },
    });

    return NextResponse.json({ success: true, message: "Knockout bracket generated successfully", bracket: bracketResult });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate bracket";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
