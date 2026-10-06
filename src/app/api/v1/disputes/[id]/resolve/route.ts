import { NextResponse } from "next/server";
import { AppError, handleApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { resolveMatchDispute } from "@/lib/disputes";
import { requireTournamentModerator } from "@/lib/permissions";
import { disputeResolutionSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = disputeResolutionSchema.parse(await req.json());
    const existing = await db.dispute.findUnique({ where: { id }, include: { match: { select: { tournamentId: true } } } });
    if (!existing) throw new AppError("DISPUTE_NOT_FOUND", "Dispute not found.", 404);
    const admin = await requireTournamentModerator(existing.match.tournamentId);
    const dispute = await resolveMatchDispute(id, admin.id, input);

    await logAudit({ userId: admin.id, action: "DISPUTE_RESOLVED", entity: "Dispute", entityId: dispute.id, newValue: { decision: input.adminDecision, status: input.status } });
    return NextResponse.json({ success: true, message: "Dispute resolved; the match remains queued for result verification.", dispute });
  } catch (error: unknown) {
    return handleApiError(error, "The dispute could not be resolved.");
  }
}
