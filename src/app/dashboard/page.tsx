import Link from "next/link";
import { ArrowRight, Award, Bell, CalendarDays, CheckCircle2, Clock3, Trophy } from "lucide-react";
import { MatchStatus, PaymentStatus, RegistrationStatus, Role, TournamentStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "../admin/AdminDashboardClient";

export const revalidate = 0;

const dateFormatter = new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/?auth=login");
  }

  if (user.role !== Role.PLAYER) return <OperationsDashboard user={user} />;

  const [profile, registrations, matches, unreadNotifications, achievementCount] = await Promise.all([
    db.profile.findUnique({ where: { userId: user.id } }),
    db.registration.findMany({ where: { userId: user.id }, include: { tournament: true, payment: true }, orderBy: { updatedAt: "desc" }, take: 6 }),
    db.match.findMany({
      where: { OR: [{ player1Id: user.id }, { player2Id: user.id }], status: { not: MatchStatus.CANCELLED } },
      include: { tournament: true, player1: { include: { profile: true } }, player2: { include: { profile: true } } },
      orderBy: { scheduledTime: "asc" },
      take: 6,
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
    db.playerAchievement.count({ where: { userId: user.id } }),
  ]);

  const activeRegistrations = registrations.filter((registration) => registration.status === RegistrationStatus.APPROVED);
  const upcomingMatches = matches.filter((match) => match.status !== MatchStatus.CONFIRMED).slice(0, 3);
  const recentResults = matches.filter((match) => match.status === MatchStatus.CONFIRMED).slice(0, 3);

  return (
    <div className="page-container sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Player dashboard</p>
          <h1 className="mt-2 break-words text-2xl font-black text-white sm:text-4xl">Welcome back, {profile?.fullName || user.email}</h1>
          <p className="mt-2 text-sm text-slate-400">Your tournaments, match tasks, payments, ranking, and results.</p>
        </div>
        <Link href="/tournaments" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400">Browse tournaments <ArrowRight className="h-4 w-4" /></Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard icon={<Trophy className="h-5 w-5 text-amber-400" />} value={profile?.rankingPoints || 0} label="Ranking points" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} value={profile?.matchesWon || 0} label="Match wins" />
        <StatCard icon={<CalendarDays className="h-5 w-5 text-cyan-400" />} value={activeRegistrations.length} label="Active tournaments" />
        <StatCard icon={<Bell className="h-5 w-5 text-rose-400" />} value={unreadNotifications} label="Unread notifications" />
        <StatCard icon={<Award className="h-5 w-5 text-violet-400" />} value={achievementCount} label="Achievements" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSection title="Upcoming matches & result tasks" aside={<Clock3 className="h-5 w-5 text-cyan-400" />}>
          {upcomingMatches.length === 0 ? <EmptyLine>No upcoming matches.</EmptyLine> : upcomingMatches.map((match) => {
            const opponent = match.player1Id === user.id ? match.player2?.profile?.username : match.player1?.profile?.username;
            return <Link key={match.id} href={`/tournaments/${match.tournament.slug}`} className="block min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/50"><p className="break-words text-xs font-bold text-cyan-400">{match.tournament.name}</p><p className="mt-1 break-words text-sm font-bold text-white">vs {opponent || "Opponent pending"}</p><p className="mt-1 text-xs text-slate-400">{match.scheduledTime ? dateFormatter.format(match.scheduledTime) : "Schedule pending"}</p></Link>;
          })}
        </DashboardSection>

        <DashboardSection title="My registrations" aside={<Link href="/tournaments" className="text-xs font-bold text-cyan-400">View tournaments</Link>}>
          {registrations.length === 0 ? <EmptyLine>You have not registered for a tournament yet.</EmptyLine> : registrations.map((registration) => <Link key={registration.id} href={`/tournaments/${registration.tournament.slug}`} className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/50 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between"><div className="min-w-0"><p className="break-words text-sm font-bold text-white">{registration.tournament.name}</p><p className="mt-1 break-words text-xs text-slate-400">{registration.payment ? `Payment: ${registration.payment.status.replaceAll("_", " ")}` : "Free registration"}</p></div><span className="self-start whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300">{registration.status.replaceAll("_", " ")}</span></Link>)}
        </DashboardSection>

        <DashboardSection title="Recent results" aside={<Link href={`/players/${profile?.username || user.email}`} className="text-xs font-bold text-cyan-400">Full profile</Link>}>
          {recentResults.length === 0 ? <EmptyLine>No verified results yet.</EmptyLine> : recentResults.map((match) => <Link key={match.id} href={`/tournaments/${match.tournament.slug}`} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"><div className="min-w-0"><p className="truncate text-xs font-bold text-cyan-400">{match.tournament.name}</p><p className="truncate text-sm font-bold text-white">{match.player1?.profile?.username || "TBD"} vs {match.player2?.profile?.username || "TBD"}</p></div><span className="shrink-0 font-mono text-sm font-black text-emerald-400">{match.player1Score}–{match.player2Score}</span></Link>)}
        </DashboardSection>

        <DashboardSection title="Fair play and support" aside={<Link href="/disputes" className="text-xs font-bold text-cyan-400">My disputes</Link>}>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">Use the dispute action on an eligible match when a result or match incident needs review.</div>
        </DashboardSection>
      </section>
    </div>
  );
}

async function OperationsDashboard({ user }: { user: Awaited<ReturnType<typeof requireAuth>> }) {
  const isModerator = user.role === Role.MODERATOR;
  const tournamentWhere = user.role === Role.TOURNAMENT_ADMIN ? { createdById: user.id } : {};
  const matchWhere = user.role === Role.TOURNAMENT_ADMIN ? { tournament: tournamentWhere } : {};
  const disputeWhere = user.role === Role.TOURNAMENT_ADMIN ? { match: { tournament: tournamentWhere } } : {};

  const [totalPlayers, totalTournaments, activeTournaments, completedTournaments, totalRegistrations, approvedParticipants, totalMatches, openDisputes, pendingPaymentsList, pendingMatchesList, tournaments, auditLogs, approvedPayments] = await Promise.all([
    user.role === Role.SUPER_ADMIN ? db.user.count({ where: { role: Role.PLAYER } }) : Promise.resolve(0),
    isModerator ? Promise.resolve(0) : db.tournament.count({ where: tournamentWhere }),
    isModerator ? Promise.resolve(0) : db.tournament.count({ where: { ...tournamentWhere, status: { in: [TournamentStatus.ONGOING, TournamentStatus.GROUP_STAGE, TournamentStatus.KNOCKOUT_STAGE] } } }),
    isModerator ? Promise.resolve(0) : db.tournament.count({ where: { ...tournamentWhere, status: TournamentStatus.COMPLETED } }),
    isModerator ? Promise.resolve(0) : db.registration.count({ where: { tournament: tournamentWhere } }),
    isModerator ? Promise.resolve(0) : db.registration.count({ where: { tournament: tournamentWhere, status: RegistrationStatus.APPROVED } }),
    isModerator ? Promise.resolve(0) : db.match.count({ where: matchWhere }),
    db.dispute.count({ where: { ...disputeWhere, status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    isModerator ? Promise.resolve([]) : db.payment.findMany({ where: { status: PaymentStatus.UNDER_REVIEW, registration: { tournament: tournamentWhere } }, include: { user: { select: { id: true, profile: { select: { username: true, fullName: true } } } }, registration: { include: { tournament: true } } }, orderBy: { createdAt: "desc" } }),
    db.match.findMany({ where: { ...matchWhere, status: { in: [MatchStatus.RESULT_SUBMITTED, MatchStatus.UNDER_REVIEW, MatchStatus.DISPUTED] } }, include: { tournament: true, player1: { select: { id: true, profile: { select: { username: true, fullName: true } } } }, player2: { select: { id: true, profile: { select: { username: true, fullName: true } } } }, submissions: true }, orderBy: { updatedAt: "desc" } }),
    isModerator ? Promise.resolve([]) : db.tournament.findMany({ where: tournamentWhere, include: { registrations: { select: { id: true, status: true, payment: { select: { status: true } } } } }, orderBy: { updatedAt: "desc" } }),
    db.auditLog.findMany({ where: user.role === Role.SUPER_ADMIN ? undefined : { userId: user.id }, take: 15, orderBy: { timestamp: "desc" }, include: { user: { select: { email: true, profile: { select: { username: true } } } } } }),
    isModerator ? Promise.resolve([]) : db.payment.findMany({ where: { status: PaymentStatus.APPROVED, registration: { tournament: tournamentWhere } }, select: { amount: true } }),
  ]);

  return <AdminDashboardClient userRole={user.role} stats={{ totalPlayers, totalTournaments, activeTournaments, completedTournaments, totalRegistrations, approvedParticipants, totalMatches, pendingPayments: pendingPaymentsList.length, pendingMatches: pendingMatchesList.length, openDisputes, totalRevenue: approvedPayments.reduce((sum, payment) => sum + payment.amount, 0) }} pendingPayments={pendingPaymentsList} pendingMatches={pendingMatchesList} tournaments={tournaments} auditLogs={auditLogs} />;
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">{icon}<p className="mt-3 text-2xl font-black text-white">{value}</p><p className="text-xs text-slate-400">{label}</p></div>;
}

function DashboardSection({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-white">{title}</h2>{aside}</div>{children}</section>;
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-slate-500">{children}</p>;
}
