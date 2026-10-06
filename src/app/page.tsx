import Link from "next/link";
import { db } from "@/lib/db";
import { TournamentCard } from "@/components/TournamentCard";
import { Trophy, Shield, Sparkles, ArrowRight, Zap, MessageSquare } from "lucide-react";
import { MatchStatus, TournamentStatus } from "@prisma/client";

export const revalidate = 0;

export default async function HomePage() {
  // Fetch tournaments
  const tournaments = await db.tournament.findMany({
    where: { status: { not: TournamentStatus.DRAFT } },
    take: 6,
    include: {
      season: true,
      registrations: { where: { status: "APPROVED" }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const enrichedTournaments = tournaments.map((t) => {
    const confirmedCount = t.registrations.length;
    const availableSlots = Math.max(0, t.totalSlots - confirmedCount);
    return {
      ...t,
      confirmedSlots: confirmedCount,
      availableSlots,
      isFull: availableSlots === 0,
    };
  });

  // Fetch top ranked players
  const topPlayers = await db.profile.findMany({
    where: { rankingPoints: { gt: 0 } },
    take: 5,
    orderBy: [{ rankingPoints: "desc" }, { championships: "desc" }],
  });

  // Fetch hall of fame champions
  const champions = await db.hallOfFame.findMany({
    take: 3,
    include: {
      tournament: true,
      champion: { include: { profile: true } },
    },
    orderBy: { dateCompleted: "desc" },
  });

  const [prizes, verifiedMatches, playerCount, completedTournaments, communitySettings, globalAnnouncement] = await Promise.all([
    db.hallOfFame.aggregate({ _sum: { prizePool: true } }),
    db.match.count({ where: { status: MatchStatus.CONFIRMED } }),
    db.profile.count(),
    db.tournament.count({ where: { status: TournamentStatus.COMPLETED } }),
    db.systemSetting.findMany({ where: { key: { in: ["WHATSAPP_COMMUNITY", "DISCORD_LINK"] } } }),
    db.announcement.findFirst({ where: { isGlobal: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const settings = new Map(communitySettings.map((setting) => [setting.key, setting.value]));
  const openTournamentCount = tournaments.filter((tournament) => tournament.status === TournamentStatus.REGISTRATION_OPEN).length;

  return (
    <div className="min-w-0 space-y-12 pb-8 sm:space-y-16 sm:pb-12">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-cyan-950/30 via-slate-950 to-[#0b0f19] py-12 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider animate-pulse">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> {openTournamentCount > 0 ? `${openTournamentCount} registration${openTournamentCount === 1 ? "" : "s"} open` : "Competitive eFootball tournaments"}
          </div>

          <h1 className="mx-auto max-w-4xl break-words text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl">
            Compete. Win. Become a <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300">Champion.</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The premier professional esports platform for eFootball Mobile tournaments. Automated group stages, live brackets, instant standings, and verified prize payouts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/tournaments"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-extrabold text-sm shadow-xl shadow-cyan-500/25 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" /> Explore Tournaments
            </Link>
            <Link
              href="/rankings"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5 text-amber-400" /> View Leaderboard
            </Link>
          </div>

          {/* Key Stats Counter Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl font-black text-white">{prizes._sum.prizePool ?? 0}</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Prizes Awarded</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl font-black text-cyan-400">{verifiedMatches}</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Matches Played</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl font-black text-emerald-400">{playerCount}</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Active Players</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl font-black text-amber-400">{completedTournaments}</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Completed Events</span>
            </div>
          </div>
        </div>
      </section>

      {globalAnnouncement && <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"><div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Platform announcement</p><h2 className="mt-2 text-lg font-black text-white">{globalAnnouncement.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{globalAnnouncement.content}</p></div></section>}

      {/* ACTIVE & UPCOMING TOURNAMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-start gap-2 text-xl font-extrabold text-white sm:items-center sm:text-2xl">
              <Trophy className="w-6 h-6 text-cyan-400" /> Featured Tournaments
            </h2>
            <p className="text-xs text-slate-400">Join ongoing or open registration cups</p>
          </div>
          <Link href="/tournaments" className="flex shrink-0 items-center gap-1 text-xs font-bold text-cyan-400 hover:underline">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrichedTournaments.length === 0 && <div className="md:col-span-2 lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center"><Trophy className="mx-auto mb-3 h-8 w-8 text-slate-600" /><p className="font-bold text-white">No tournaments are currently available.</p><p className="mt-1 text-xs text-slate-400">Published tournaments will appear here.</p></div>}
          {enrichedTournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      </section>

      {/* TOP PLAYERS LEADERBOARD & HALL OF FAME GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Players Box */}
        <div className="lg:col-span-2 space-y-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" /> Top Global Leaderboard
              </h3>
              <p className="text-xs text-slate-400">Highest ranking eFootball Mobile players</p>
            </div>
            <Link href="/rankings" className="text-xs font-bold text-amber-400 hover:underline">Full Standings</Link>
          </div>

          <div className="space-y-3">
            {topPlayers.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-400">No rankings are available yet.</p>}
            {topPlayers.map((p, idx) => (
              <div key={p.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3 transition-colors hover:border-slate-700 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`w-7 h-7 rounded-xl font-extrabold text-xs flex items-center justify-center ${
                    idx === 0 ? "bg-amber-400 text-black shadow-md shadow-amber-400/20" : idx === 1 ? "bg-slate-300 text-black" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/players/${p.username}`} className="block truncate text-sm font-bold text-white hover:text-cyan-400">
                      {p.fullName} ({p.username})
                    </Link>
                    <span className="block truncate text-[10px] text-slate-400">{p.teamName} • IGN: {p.efootballIgn}</span>
                  </div>
                </div>
                <div className="shrink-0 text-left min-[430px]:text-right">
                  <span className="text-sm font-extrabold text-amber-400 font-mono block">🏆 {p.rankingPoints} pts</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{p.championships} Championships</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hall of Fame Highlights */}
        <div className="space-y-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" /> Hall of Fame
            </h3>
            <p className="text-xs text-slate-400">Historic tournament champions</p>

            <div className="space-y-3 pt-2">
              {champions.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-400">No champions have been recorded.</p>}
              {champions.map((c) => (
                <div key={c.id} className="min-w-0 space-y-1 rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                  <span className="block truncate text-[10px] font-semibold uppercase text-cyan-400">{c.tournament.name}</span>
                  <div className="flex min-w-0 flex-col gap-1 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
                    <span className="flex min-w-0 items-center gap-1 truncate text-sm font-extrabold text-amber-300">
                      👑 {c.champion.profile?.username}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">Prize ৳{c.prizePool}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link href="/hall-of-fame" className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 text-center block transition-colors mt-4">
            View Hall of Fame Archive
          </Link>
        </div>
      </section>

      {/* COMMUNITY & SOCIAL LINKS */}
      {(settings.get("WHATSAPP_COMMUNITY") || settings.get("DISCORD_LINK")) && <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/60 p-5 text-center sm:p-8">
          <h3 className="text-2xl font-extrabold text-white">Join the eF Masters Community</h3>
          <p className="text-xs text-slate-300 max-w-xl mx-auto">
            Get instant match reminders, group draw announcements, referee support, and chat with fellow eFootball Mobile gamers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href={settings.get("WHATSAPP_COMMUNITY") || "#"}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Official WhatsApp Group
            </a>
            <a
              href={settings.get("DISCORD_LINK") || "#"}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center gap-2 hover:bg-indigo-500 transition-colors"
            >
              Official Discord Server
            </a>
          </div>
        </div>
      </section>}

      {/* FOOTER */}
      <footer className="space-y-3 border-t border-slate-800/80 px-4 pt-8 text-center text-xs text-slate-500 sm:px-6">
        <p>© 2026 eF Masters Arena. All rights reserved. eFootball is a registered trademark of Konami Digital Entertainment.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-400">
          <Link href="/tournaments" className="hover:text-cyan-400">Tournaments</Link>
          <Link href="/rankings" className="hover:text-cyan-400">Leaderboard</Link>
          <Link href="/hall-of-fame" className="hover:text-cyan-400">Hall of Fame</Link>
          <Link href="/disputes" className="hover:text-cyan-400">Rules & Disputes</Link>
        </div>
      </footer>
    </div>
  );
}
