import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { AdminDashboardClient } from "./AdminDashboardClient";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.TOURNAMENT_ADMIN && user.role !== Role.MODERATOR)) {
    redirect("/");
  }
  const tournamentScope = user.role === Role.TOURNAMENT_ADMIN ? { createdById: user.id } : {};

  // Fetch Stats
  const totalPlayers = await db.user.count({ where: { role: Role.PLAYER } });
  const totalTournaments = await db.tournament.count({ where: tournamentScope });
  const activeTournaments = await db.tournament.count({ where: { ...tournamentScope, status: "ONGOING" } });

  const pendingPaymentsList = await db.payment.findMany({
    where: user.role === Role.MODERATOR
      ? { status: "UNDER_REVIEW", id: "__no_payment_access__" }
      : { status: "UNDER_REVIEW", registration: { tournament: tournamentScope } },
    include: {
      user: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
      registration: { include: { tournament: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingMatchesList = await db.match.findMany({
    where: { status: "RESULT_SUBMITTED", tournament: tournamentScope },
    include: {
      tournament: true,
      player1: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
      player2: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
      submissions: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const tournaments = await db.tournament.findMany({
    where: user.role === Role.SUPER_ADMIN ? undefined : tournamentScope,
    include: {
      season: true,
      registrations: { where: { status: "APPROVED" } },
      _count: { select: { matches: true, groups: true, brackets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const auditLogs = await db.auditLog.findMany({
    where: user.role === Role.SUPER_ADMIN ? undefined : { userId: user.id },
    take: 15,
    orderBy: { timestamp: "desc" },
    include: {
      user: { select: { email: true, profile: { select: { username: true } } } },
    },
  });

  const approvedPayments = await db.payment.findMany({
    where: user.role === Role.MODERATOR
      ? { status: "APPROVED", id: "__no_payment_access__" }
      : { status: "APPROVED", registration: { tournament: tournamentScope } },
    select: { amount: true },
  });
  const totalRevenue = approvedPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <AdminDashboardClient
      userRole={user.role}
      stats={{
        totalPlayers,
        totalTournaments,
        activeTournaments,
        pendingPayments: pendingPaymentsList.length,
        pendingMatches: pendingMatchesList.length,
        totalRevenue,
      }}
      pendingPayments={pendingPaymentsList}
      pendingMatches={pendingMatchesList}
      tournaments={tournaments}
      auditLogs={auditLogs}
    />
  );
}
