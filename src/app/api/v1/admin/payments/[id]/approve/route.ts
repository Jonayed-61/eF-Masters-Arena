import { NextResponse } from "next/server";
import { AppError, handleApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";
import { approvePayment } from "@/lib/payments";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payment = await db.payment.findUnique({ where: { id }, include: { registration: { include: { tournament: true } } } });
    if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "Payment record not found.", 404);
    const admin = await requireTournamentOwnerOrSuperAdmin(payment.registration.tournamentId);
    const updatedPayment = await approvePayment(id, admin.id);

    await logAudit({ userId: admin.id, action: "PAYMENT_APPROVED", entity: "Payment", entityId: payment.id, newValue: { transactionId: payment.transactionId, amount: payment.amount } });
    return NextResponse.json({ success: true, message: "Payment approved and registration confirmed.", payment: updatedPayment });
  } catch (error: unknown) {
    return handleApiError(error, "Payment could not be approved.");
  }
}
