import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN, Role.MODERATOR]);
    const tournamentScope = user.role === Role.SUPER_ADMIN ? {} : { createdById: user.id };
    const registrationScope = user.role === Role.SUPER_ADMIN ? {} : { registration: { tournament: tournamentScope } };
    const matchScope = user.role === Role.SUPER_ADMIN ? {} : { tournament: tournamentScope };

    const totalPlayers = await db.user.count({ where: { role: Role.PLAYER } });
    const totalTournaments = await db.tournament.count({ where: tournamentScope });
    const activeTournaments = await db.tournament.count({ where: { ...tournamentScope, status: "ONGOING" } });
    const upcomingTournaments = await db.tournament.count({ where: { ...tournamentScope, status: "UPCOMING" } });
    const pendingPayments = await db.payment.count({ where: { ...registrationScope, status: "UNDER_REVIEW" } });
    const pendingMatches = await db.match.count({ where: { ...matchScope, status: "RESULT_SUBMITTED" } });
    const openDisputes = await db.dispute.count({
      where: user.role === Role.SUPER_ADMIN
        ? { status: "OPEN" }
        : { status: "OPEN", match: { tournament: tournamentScope } },
    });

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
        totalRevenue,
        totalPrizeMoney,
      },
      recentAuditLogs,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch analytics";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
