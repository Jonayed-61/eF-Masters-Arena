import { Prisma, RegistrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { AppError, handleApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { assertRegistrationAllowed } from "@/lib/tournament/lifecycle";
import { tournamentRegistrationSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireUser();
    const { slug } = await params;
    const input = tournamentRegistrationSchema.parse(await req.json());
    const tournament = await db.tournament.findUnique({ where: { slug } });
    if (!tournament) throw new AppError("TOURNAMENT_NOT_FOUND", "Tournament not found.", 404);
    const existing = await db.registration.findUnique({ where: { tournamentId_userId: { tournamentId: tournament.id, userId: user.id } }, select: { id: true } });
    if (existing) throw new AppError("DUPLICATE_REGISTRATION", "You already have a registration for this tournament.", 409);

    const result = await db.$transaction(async (tx) => {
      const currentTournament = await tx.tournament.findUniqueOrThrow({ where: { id: tournament.id } });
      const confirmedCount = await tx.registration.count({ where: { tournamentId: tournament.id, status: RegistrationStatus.APPROVED } });
      assertRegistrationAllowed({ status: currentTournament.status, registrationStart: currentTournament.registrationStart, registrationEnd: currentTournament.registrationEnd, confirmedCount, totalSlots: currentTournament.totalSlots, isBanned: user.isBanned });
      let finalFee = currentTournament.entryFee;
      let appliedCoupon: string | null = null;
      let discountAmount = 0;
      if (input.couponCode && finalFee > 0) {
        const code = input.couponCode.toUpperCase();
        const coupon = await tx.coupon.findUnique({ where: { code } });
        if (!coupon || coupon.usedCount >= coupon.maxUses || (coupon.expiresAt && coupon.expiresAt <= new Date())) throw new AppError("INVALID_COUPON", "The coupon is invalid, expired, or fully redeemed.", 409);
        discountAmount = coupon.discountType === "PERCENTAGE" ? finalFee * (coupon.discountVal / 100) : coupon.discountVal;
        discountAmount = Math.min(finalFee, Math.round(discountAmount * 100) / 100);
        finalFee = Math.round((finalFee - discountAmount) * 100) / 100;
        const reserved = await tx.coupon.updateMany({ where: { id: coupon.id, usedCount: { lt: coupon.maxUses } }, data: { usedCount: { increment: 1 } } });
        if (reserved.count !== 1) throw new AppError("COUPON_LIMIT_REACHED", "The coupon has reached its usage limit.", 409);
        appliedCoupon = coupon.code;
      }
      const isFree = finalFee === 0;
      const registration = await tx.registration.create({
        data: { tournamentId: currentTournament.id, userId: user.id, status: isFree ? RegistrationStatus.APPROVED : RegistrationStatus.PENDING_PAYMENT, appliedCoupon, discountAmount, finalFee, registrationData: input.registrationData || null },
      });
      if (isFree) {
        await tx.tournamentParticipant.upsert({ where: { tournamentId_userId: { tournamentId: currentTournament.id, userId: user.id } }, update: {}, create: { tournamentId: currentTournament.id, userId: user.id } });
      }
      await tx.notification.create({
        data: { userId: user.id, title: isFree ? "Registration confirmed" : "Registration created", message: isFree ? `Your place in ${currentTournament.name} is confirmed.` : `Your registration for ${currentTournament.name} is waiting for payment proof.`, link: `/tournaments/${currentTournament.slug}` },
      });
      return { registration, requiresPayment: !isFree, amountDue: finalFee };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, "Registration could not be completed.");
  }
}
