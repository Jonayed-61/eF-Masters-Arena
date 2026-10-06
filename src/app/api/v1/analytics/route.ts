import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireAdmin();
    const tournamentScope = user.role === Role.TOURNAMENT_ADMIN ? { createdById: user.id } : {};
    const registrationScope = user.role === Role.MODERATOR ? { id: "__no_payment_access__" } : user.role === Role.SUPER_ADMIN ? {} : { registration: { tournament: tournamentScope } };
    const matchScope = user.role === Role.SUPER_ADMIN ? {} : { tournament: tournamentScope };

    const totalPlayers = await db.user.count({ where: { role: Role.PLAYER } });
    const totalTournaments = await db.tournament.count({ where: tournamentScope });
    const activeTournaments = await db.tournament.count({ where: { ...tournamentScope, status: { in: ["ONGOING", "GROUP_STAGE", "KNOCKOUT_STAGE"] } } });
    const upcomingTournaments = await db.tournament.count({ where: { ...tournamentScope, status: "UPCOMING" } });
    const pendingPayments = await db.payment.count({ where: { ...registrationScope, status: "UNDER_REVIEW" } });
    const pendingMatches = await db.match.count({ where: { ...matchScope, status: "RESULT_SUBMITTED" } });
    const openDisputes = await db.dispute.count({
      where: user.role === Role.SUPER_ADMIN
        ? { status: "OPEN" }
        : { status: "OPEN", match: { tournament: tournamentScope } },
    });
    const approvedParticipants = await db.registration.count({ where: { tournament: tournamentScope, status: "APPROVED" } });
    const completedTournaments = await db.tournament.count({ where: { ...tournamentScope, status: "COMPLETED" } });

    // Aggregate total entry revenue
    const approvedPayments = await db.payment.findMany({
      where: { ...registrationScope, status: "APPROVED" },
      select: { amount: true },
    });
    const totalRevenue = approvedPayments.reduce((acc, p) => acc + p.amount, 0);

    // Aggregate total prize money
    const tournamentsPrizes = await db.tournament.findMany({
      where: tournamentScope,
      select: { prizePool: true },
    });
    const totalPrizeMoney = tournamentsPrizes.reduce((acc, t) => acc + t.prizePool, 0);

    // Recent Audit Logs
    const recentAuditLogs = await db.auditLog.findMany({
      where: user.role === Role.SUPER_ADMIN ? undefined : { userId: user.id },
      take: 10,
      orderBy: { timestamp: "desc" },
      include: {
        user: { select: { email: true, profile: { select: { username: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalPlayers,
        totalTournaments,
        activeTournaments,
        upcomingTournaments,
        pendingPayments,
        pendingMatches,
        openDisputes,
        approvedParticipants,
        completedTournaments,
        totalRevenue,
        totalPrizeMoney,
      },
      recentAuditLogs,
    });
  } catch (err: unknown) {
    return handleApiError(err, "Analytics could not be loaded.");
  }
}
