import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageTournament, requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { generateGroupsEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const { slug } = await params;
    const body = await req.json();
    const groupCount = body.groupCount || 4;

    const tournament = await db.tournament.findUnique({ where: { slug } });
    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (!(await canManageTournament(user, tournament.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const groups = await generateGroupsEngine(tournament.id, groupCount);

    await logAudit({
      userId: user.id,
      action: "GROUPS_GENERATED",
      entity: "Tournament",
      entityId: tournament.id,
      newValue: { count: groupCount },
    });

    return NextResponse.json({ success: true, message: `Successfully generated ${groupCount} groups`, groups });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate groups";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
