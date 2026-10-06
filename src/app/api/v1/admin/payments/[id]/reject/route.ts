import { NextResponse } from "next/server";
import { AppError, handleApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";
import { paymentDecisionSchema } from "@/lib/validators";
import { rejectPayment } from "@/lib/payments";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = paymentDecisionSchema.parse(await req.json());
    const reason = input.reason || "Payment evidence could not be verified.";
    const payment = await db.payment.findUnique({ where: { id }, include: { registration: { include: { tournament: true } } } });
    if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "Payment record not found.", 404);
    const admin = await requireTournamentOwnerOrSuperAdmin(payment.registration.tournamentId);
    const updatedPayment = await rejectPayment(id, admin.id, reason);

    await logAudit({ userId: admin.id, action: "PAYMENT_REJECTED", entity: "Payment", entityId: payment.id, newValue: { reason } });
    return NextResponse.json({ success: true, message: "Payment rejected.", payment: updatedPayment });
  } catch (error: unknown) {
    return handleApiError(error, "Payment could not be rejected.");
  }
}
