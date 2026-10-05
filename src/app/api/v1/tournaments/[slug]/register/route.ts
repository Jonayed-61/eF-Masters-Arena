import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getTournamentSlotStatus } from "@/lib/tournament-engine";
import { PaymentStatus, Prisma, RegistrationStatus, TournamentStatus } from "@prisma/client";
import { paymentSubmissionSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireAuth();
    const { slug } = await params;

    const tournament = await db.tournament.findUnique({
      where: { slug },
      include: { rules: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // Step 2: Check Status
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      return NextResponse.json({ error: `Registration is not open for this tournament (Status: ${tournament.status}).` }, { status: 400 });
    }

    // Step 3: Check Deadline
    if (new Date() > new Date(tournament.registrationEnd)) {
      return NextResponse.json({ error: "Registration deadline has passed." }, { status: 400 });
    }

    // Step 4: Slot Management (Check capacity)
    const slotStatus = await getTournamentSlotStatus(tournament.id);
    if (slotStatus.isFull) {
      return NextResponse.json({ error: "Slots Full! This tournament has reached maximum player capacity." }, { status: 400 });
    }

    // Step 5: Duplicate Registration Check
    const existingRegistration = await db.registration.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: tournament.id,
          userId: user.id,
        },
      },
    });

    if (existingRegistration) {
      return NextResponse.json(
        { error: "You are already registered or have a pending payment for this tournament.", status: existingRegistration.status },
        { status: 400 }
      );
    }

    const body = await req.json();
    const paymentVal = tournament.entryFee > 0 ? paymentSubmissionSchema.parse(body) : null;

    // Step 6: Fee & Coupon calculation
    let finalFee = tournament.entryFee;
    let appliedCoupon = null;
    let discountAmount = 0;

    if (body.couponCode && finalFee > 0) {
      const coupon = await db.coupon.findUnique({ where: { code: body.couponCode.toUpperCase() } });
      if (coupon && coupon.usedCount < coupon.maxUses && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        appliedCoupon = coupon.code;
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount = (finalFee * coupon.discountVal) / 100;
        } else {
          discountAmount = coupon.discountVal;
        }
        finalFee = Math.max(0, finalFee - discountAmount);

      } else {
        return NextResponse.json({ error: "Coupon is invalid, expired, or fully redeemed." }, { status: 400 });
      }
    }

    // Step 7: Handle Free vs Paid Tournament
    if (tournament.entryFee === 0 || finalFee === 0) {
      // Auto approve free registration
      const registration = await db.$transaction(async (tx) => {
        const confirmedCount = await tx.registration.count({
          where: { tournamentId: tournament.id, status: RegistrationStatus.APPROVED },
        });
        if (confirmedCount >= tournament.totalSlots) throw new Error("Slots Full! This tournament has reached maximum player capacity.");
        const created = await tx.registration.create({
          data: {
            tournamentId: tournament.id,
            userId: user.id,
            status: RegistrationStatus.APPROVED,
            appliedCoupon,
            discountAmount,
            finalFee: 0,
          },
        });
        await tx.tournamentParticipant.create({
          data: { tournamentId: tournament.id, userId: user.id },
        });
        return created;
      });

      await db.notification.create({
        data: {
          userId: user.id,
          title: "🎉 Registration Confirmed!",
          message: `Your registration for ${tournament.name} is confirmed as a official participant.`,
          link: `/tournaments/${tournament.slug}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Registration confirmed automatically!",
        registration,
      });
    }

    // Paid tournament: Validate payment submission details
    if (!paymentVal || Math.abs(paymentVal.amount - finalFee) > 0.001) {
      return NextResponse.json({ error: "Submitted payment amount does not match the amount due." }, { status: 400 });
    }
    const duplicateTransaction = await db.payment.findFirst({ where: { transactionId: paymentVal.transactionId } });
    if (duplicateTransaction) {
      return NextResponse.json({ error: "This transaction ID has already been submitted." }, { status: 409 });
    }
    const registration = await db.$transaction(async (tx) => {
      const existing = await tx.registration.findUnique({
        where: { tournamentId_userId: { tournamentId: tournament.id, userId: user.id } },
      });
      if (existing) throw new Error("You are already registered or have a pending payment for this tournament.");

      const confirmedCount = await tx.registration.count({
        where: { tournamentId: tournament.id, status: RegistrationStatus.APPROVED },
      });
      if (confirmedCount >= tournament.totalSlots) throw new Error("Slots Full! This tournament has reached maximum player capacity.");

      if (appliedCoupon) {
        const couponUse = await tx.coupon.updateMany({
          where: { code: appliedCoupon, usedCount: { lt: (await tx.coupon.findUniqueOrThrow({ where: { code: appliedCoupon }, select: { maxUses: true } })).maxUses } },
          data: { usedCount: { increment: 1 } },
        });
        if (couponUse.count !== 1) throw new Error("Coupon has reached its usage limit.");
      }

      return tx.registration.create({
        data: {
          tournamentId: tournament.id,
          userId: user.id,
          status: RegistrationStatus.UNDER_REVIEW,
          appliedCoupon,
          discountAmount,
          finalFee,
          payment: {
            create: {
              userId: user.id,
              method: paymentVal.method,
              senderNumber: paymentVal.senderNumber,
              transactionId: paymentVal.transactionId,
              amount: paymentVal.amount,
              screenshot: paymentVal.screenshot,
              status: PaymentStatus.UNDER_REVIEW,
            },
          },
        },
        include: { payment: true },
      });
    });

    await db.notification.create({
      data: {
        userId: user.id,
        title: "⌛ Payment Submitted for Review",
        message: `Your payment (TrxID: ${paymentVal.transactionId}) for ${tournament.name} is under review by administrators.`,
        link: `/tournaments/${tournament.slug}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registration and payment submitted for admin review!",
      registration,
    });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "This registration or transaction has already been submitted." }, { status: 409 });
    }
    const errorMsg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
