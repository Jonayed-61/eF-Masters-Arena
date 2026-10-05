import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, Bell, Trophy, ArrowRight } from "lucide-react";
import { MatchStatus, RegistrationStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const revalidate = 0;

const dateFormatter = new Intl.DateTimeFormat("en-BD", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PlayerDashboardPage() {
  const user = await requireAuth();
  const [profile, registrations, matches, unreadNotifications] = await Promise.all([
    db.profile.findUnique({ where: { userId: user.id } }),
    db.registration.findMany({
      where: { userId: user.id },
      include: { tournament: true, payment: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    db.match.findMany({
      where: {
        OR: [{ player1Id: user.id }, { player2Id: user.id }],
        status: { not: MatchStatus.CANCELLED },
      },
      include: { tournament: true, player1: { include: { profile: true } }, player2: { include: { profile: true } } },
      orderBy: { scheduledTime: "asc" },
      take: 6,
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  const activeRegistrations = registrations.filter((registration) => registration.status === RegistrationStatus.APPROVED);
  const upcomingMatches = matches.filter((match) => match.status !== MatchStatus.CONFIRMED).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">Player Dashboard</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white">Welcome back, {profile?.fullName || user.email}</h1>
          <p className="mt-2 text-sm text-slate-400">Track your tournaments, matches, payments, and ranking from one place.</p>
        </div>
        <Link href="/tournaments" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400">
          Browse tournaments <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><Trophy className="w-5 h-5 text-amber-400" /><p className="mt-3 text-2xl font-black text-white">{profile?.rankingPoints || 0}</p><p className="text-xs text-slate-400">Ranking points</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><p className="mt-3 text-2xl font-black text-white">{profile?.matchesWon || 0}</p><p className="text-xs text-slate-400">Match wins</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><CalendarDays className="w-5 h-5 text-cyan-400" /><p className="mt-3 text-2xl font-black text-white">{activeRegistrations.length}</p><p className="text-xs text-slate-400">Active tournaments</p></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><Bell className="w-5 h-5 text-rose-400" /><p className="mt-3 text-2xl font-black text-white">{unreadNotifications}</p><p className="text-xs text-slate-400">Unread notifications</p></div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-white">Upcoming matches</h2><Clock3 className="w-5 h-5 text-cyan-400" /></div>
          {upcomingMatches.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No upcoming matches.</p> : upcomingMatches.map((match) => {
            const opponent = match.player1Id === user.id ? match.player2?.profile?.username : match.player1?.profile?.username;
            return <Link key={match.id} href={`/tournaments/${match.tournament.slug}`} className="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/50"><p className="text-xs text-cyan-400 font-bold">{match.tournament.name}</p><p className="mt-1 text-sm font-bold text-white">vs {opponent || "Opponent pending"}</p><p className="mt-1 text-xs text-slate-400">{match.scheduledTime ? dateFormatter.format(match.scheduledTime) : "Schedule pending"}</p></Link>;
          })}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-white">My registrations</h2><Link href="/tournaments" className="text-xs font-bold text-cyan-400">View tournaments</Link></div>
          {registrations.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">You have not registered for a tournament yet.</p> : registrations.map((registration) => <Link key={registration.id} href={`/tournaments/${registration.tournament.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/50"><div><p className="text-sm font-bold text-white">{registration.tournament.name}</p><p className="mt-1 text-xs text-slate-400">{registration.payment ? `Payment: ${registration.payment.status}` : "Free registration"}</p></div><span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300">{registration.status.replaceAll("_", " ")}</span></Link>)}
        </div>
      </section>
    </div>
  );
}