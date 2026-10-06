import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateGroupsEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";
import { z } from "zod";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { groupCount } = z.object({ groupCount: z.number().int().min(1).max(8) }).parse(await req.json());

    const tournament = await db.tournament.findUnique({ where: { slug } });
    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    const user = await requireTournamentOwnerOrSuperAdmin(tournament.id);

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
    return handleApiError(err, "Groups could not be generated.");
  }
}
