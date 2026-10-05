import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageTournament, requireAuth } from "@/lib/auth";
import { PaymentStatus, RegistrationStatus, Role } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: { registration: { include: { tournament: true } } },
    });

    if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    if (!(await canManageTournament(admin, payment.registration.tournamentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (payment.status === PaymentStatus.APPROVED && payment.registration.status === RegistrationStatus.APPROVED) {
      return NextResponse.json({ success: true, message: "Payment was already approved.", payment });
    }
    if (Math.abs(payment.amount - payment.registration.finalFee) > 0.001) {
      return NextResponse.json({ error: "Payment amount does not match the registration fee." }, { status: 409 });
    }

    const updatedPayment = await db.$transaction(async (tx) => {
      const confirmedCount = await tx.registration.count({
        where: { tournamentId: payment.registration.tournamentId, status: RegistrationStatus.APPROVED },
      });
      if (confirmedCount >= payment.registration.tournament.totalSlots) {
        throw new Error("Tournament is full; this payment cannot be approved.");
      }
      const updated = await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.APPROVED, rejectionReason: null },
      });
      await tx.registration.update({
        where: { id: payment.registrationId },
        data: { status: RegistrationStatus.APPROVED, rejectionReason: null },
      });
      await tx.tournamentParticipant.upsert({
        where: { tournamentId_userId: { tournamentId: payment.registration.tournamentId, userId: payment.userId } },
        update: {},
        create: { tournamentId: payment.registration.tournamentId, userId: payment.userId },
      });
      return updated;
    });

    // Send confirmation notification
    await db.notification.create({
      data: {
        userId: payment.userId,
        title: "✅ Payment Approved! Slot Confirmed",
        message: `Your payment of ৳${payment.amount} (TrxID: ${payment.transactionId}) has been verified. You are now an official participant!`,
        link: `/tournaments`,
      },
    });

    await logAudit({
      userId: admin.id,
      action: "PAYMENT_APPROVED",
      entity: "Payment",
      entityId: payment.id,
      newValue: { transactionId: payment.transactionId, amount: payment.amount },
    });

    return NextResponse.json({ success: true, message: "Payment approved & registration confirmed!", payment: updatedPayment });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to approve payment";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
