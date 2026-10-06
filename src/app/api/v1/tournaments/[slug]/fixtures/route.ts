import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGroupFixturesEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const tournament = await db.tournament.findUnique({ where: { slug } });
    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    const user = await requireTournamentOwnerOrSuperAdmin(tournament.id);

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
    return handleApiError(err, "Fixtures could not be generated.");
  }
}
