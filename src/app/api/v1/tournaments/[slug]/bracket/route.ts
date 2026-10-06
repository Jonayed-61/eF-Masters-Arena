import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateKnockoutBracketEngine } from "@/lib/tournament-engine";
import { logAudit } from "@/lib/audit";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";
import { z } from "zod";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { topPerGroup } = z.object({ topPerGroup: z.number().int().min(1).max(4) }).parse(await req.json());

    const tournament = await db.tournament.findUnique({ where: { slug } });
    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    const user = await requireTournamentOwnerOrSuperAdmin(tournament.id);

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
    return handleApiError(err, "The knockout bracket could not be generated.");
  }
}
