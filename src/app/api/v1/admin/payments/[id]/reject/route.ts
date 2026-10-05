import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageTournament, requireAuth } from "@/lib/auth";
import { PaymentStatus, RegistrationStatus, Role } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const { id } = await params;
    const body = await req.json();
    const reason = typeof body.reason === "string" && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 500)
      : "Transaction verification failed or invalid screenshots";

    const payment = await db.payment.findUnique({
      where: { id },
      include: { registration: { include: { tournament: true } } },
    });

    if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    if (!(await canManageTournament(admin, payment.registration.tournamentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (payment.status === PaymentStatus.APPROVED || payment.status === PaymentStatus.REFUNDED) {
      return NextResponse.json({ error: "Approved or refunded payments cannot be rejected." }, { status: 409 });
    }
    if (payment.status === PaymentStatus.REJECTED && payment.registration.status === RegistrationStatus.REJECTED) {
      return NextResponse.json({ success: true, message: "Payment was already rejected.", payment });
    }

    const updatedPayment = await db.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.REJECTED, rejectionReason: reason },
      });
      await tx.registration.update({
        where: { id: payment.registrationId },
        data: { status: RegistrationStatus.REJECTED, rejectionReason: reason },
      });
      return updated;
    });

    await db.notification.create({
      data: {
        userId: payment.userId,
        title: "❌ Payment Rejected",
        message: `Your payment (TrxID: ${payment.transactionId}) was rejected. Reason: ${reason}`,
        link: `/tournaments`,
      },
    });

    await logAudit({
      userId: admin.id,
      action: "PAYMENT_REJECTED",
      entity: "Payment",
      entityId: payment.id,
      newValue: { reason },
    });

    return NextResponse.json({ success: true, message: "Payment rejected", payment: updatedPayment });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to reject payment";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
