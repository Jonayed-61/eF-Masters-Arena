import { PaymentStatus, Prisma, RegistrationStatus } from "@prisma/client";
import { AppError } from "./api-response";
import { db } from "./db";

export type PaymentProofInput = {
  method: string;
  senderNumber: string;
  transactionId: string;
  amount: number;
  screenshot: string;
};

export async function submitPaymentProof(tournamentSlug: string, userId: string, input: PaymentProofInput) {
  const registration = await db.registration.findFirst({
    where: { tournament: { slug: tournamentSlug }, userId },
    include: { tournament: true, payment: true },
  });
  if (!registration) throw new AppError("REGISTRATION_NOT_FOUND", "Register for this tournament before submitting payment.", 404);
  if (registration.status === RegistrationStatus.APPROVED || registration.status === RegistrationStatus.CANCELLED) {
    throw new AppError("REGISTRATION_FINAL", "This registration no longer accepts payment submissions.", 409);
  }
  if (registration.finalFee <= 0) throw new AppError("PAYMENT_NOT_REQUIRED", "This registration does not require payment.", 409);
  if (Math.abs(input.amount - registration.finalFee) > 0.001) {
    throw new AppError("PAYMENT_AMOUNT_MISMATCH", "The submitted amount does not match the amount due.", 409);
  }
  if (registration.payment?.status === PaymentStatus.APPROVED) {
    throw new AppError("PAYMENT_ALREADY_APPROVED", "This payment is already approved.", 409);
  }

  return db.$transaction(async (tx) => {
    const duplicate = await tx.payment.findFirst({
      where: { transactionId: input.transactionId, NOT: { registrationId: registration.id } },
      select: { id: true },
    });
    if (duplicate) throw new AppError("DUPLICATE_TRANSACTION", "This transaction ID has already been submitted.", 409);
    const payment = await tx.payment.upsert({
      where: { registrationId: registration.id },
      update: { ...input, status: PaymentStatus.UNDER_REVIEW, rejectionReason: null, reviewedById: null, reviewedAt: null },
      create: { registrationId: registration.id, userId, ...input, status: PaymentStatus.UNDER_REVIEW },
    });
    await tx.registration.update({
      where: { id: registration.id },
      data: { status: RegistrationStatus.UNDER_REVIEW, rejectionReason: null },
    });
    await tx.notification.create({
      data: {
        userId,
        title: "Payment submitted",
        message: `Your payment for ${registration.tournament.name} is awaiting verification.`,
        link: `/tournaments/${tournamentSlug}`,
      },
    });
    return payment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function approvePayment(paymentId: string, reviewerId: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { registration: { include: { tournament: true } } } });
    if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "Payment record not found.", 404);
    if (payment.status === PaymentStatus.APPROVED && payment.registration.status === RegistrationStatus.APPROVED) return payment;
    if (payment.status !== PaymentStatus.UNDER_REVIEW) throw new AppError("PAYMENT_NOT_REVIEWABLE", "Only submitted payments can be approved.", 409);
    if (Math.abs(payment.amount - payment.registration.finalFee) > 0.001) throw new AppError("PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match the registration fee.", 409);
    const confirmedCount = await tx.registration.count({ where: { tournamentId: payment.registration.tournamentId, status: RegistrationStatus.APPROVED } });
    if (confirmedCount >= payment.registration.tournament.totalSlots) throw new AppError("TOURNAMENT_FULL", "The tournament is full; this payment cannot be approved.", 409);
    const updated = await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.APPROVED, rejectionReason: null, reviewedById: reviewerId, reviewedAt: new Date() } });
    await tx.registration.update({ where: { id: payment.registrationId }, data: { status: RegistrationStatus.APPROVED, rejectionReason: null } });
    await tx.tournamentParticipant.upsert({ where: { tournamentId_userId: { tournamentId: payment.registration.tournamentId, userId: payment.userId } }, update: {}, create: { tournamentId: payment.registration.tournamentId, userId: payment.userId } });
    await tx.notification.create({ data: { userId: payment.userId, title: "Payment approved", message: `Your payment for ${payment.registration.tournament.name} was verified and your place is confirmed.`, link: `/tournaments/${payment.registration.tournament.slug}` } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rejectPayment(paymentId: string, reviewerId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { registration: { include: { tournament: true } } } });
    if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "Payment record not found.", 404);
    if (payment.status === PaymentStatus.REJECTED && payment.registration.status === RegistrationStatus.REJECTED) return payment;
    if (payment.status !== PaymentStatus.UNDER_REVIEW) throw new AppError("PAYMENT_NOT_REVIEWABLE", "Only submitted payments can be rejected.", 409);
    const updated = await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.REJECTED, rejectionReason: reason, reviewedById: reviewerId, reviewedAt: new Date() } });
    await tx.registration.update({ where: { id: payment.registrationId }, data: { status: RegistrationStatus.REJECTED, rejectionReason: reason } });
    await tx.notification.create({ data: { userId: payment.userId, title: "Payment rejected", message: `Your payment for ${payment.registration.tournament.name} was rejected: ${reason}`, link: `/tournaments/${payment.registration.tournament.slug}` } });
    return updated;
  });
}
