import Link from "next/link";
import { db } from "@/lib/db";
import { TournamentCard } from "@/components/TournamentCard";
import { Trophy, Shield, Sparkles, Users, ArrowRight, Zap, Award, Flame, MessageSquare } from "lucide-react";

export const revalidate = 0;

export default async function HomePage() {
  // Fetch tournaments
  const tournaments = await db.tournament.findMany({
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

  // Fetch latest news
  const latestNews = await db.news.findMany({ take: 3, orderBy: { published: "desc" } });

  return (
    <div className="space-y-16 pb-12">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cyan-950/30 via-slate-950 to-[#0b0f19] border-b border-slate-800/80 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider animate-pulse">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> eFootball Mobile Season 4 Live
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
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
              <span className="text-2xl font-black text-white">৳15,000+</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Prizes Awarded</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl font-black text-cyan-400">1,200+</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Matches Played</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl font-black text-emerald-400">500+</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Active Players</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-2xl font-black text-amber-400">100%</span>
              <span className="text-[11px] block text-slate-400 font-semibold uppercase mt-0.5">Verified Payouts</span>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE & UPCOMING TOURNAMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-cyan-400" /> Featured Tournaments
            </h2>
            <p className="text-xs text-slate-400">Join ongoing or open registration cups</p>
          </div>
          <Link href="/tournaments" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            {topPlayers.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-xl font-extrabold text-xs flex items-center justify-center ${
                    idx === 0 ? "bg-amber-400 text-black shadow-md shadow-amber-400/20" : idx === 1 ? "bg-slate-300 text-black" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
                    #{idx + 1}
                  </span>
                  <div>
                    <Link href={`/players/${p.username}`} className="font-bold text-sm text-white hover:text-cyan-400 block">
                      {p.fullName} ({p.username})
                    </Link>
                    <span className="text-[10px] text-slate-400">{p.teamName} • IGN: {p.efootballIgn}</span>
                  </div>
                </div>
                <div className="text-right">
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
              {champions.map((c) => (
                <div key={c.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase">{c.tournament.name}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-amber-300 flex items-center gap-1">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/60 border border-slate-800 text-center space-y-4">
          <h3 className="text-2xl font-extrabold text-white">Join the eF Masters Community</h3>
          <p className="text-xs text-slate-300 max-w-xl mx-auto">
            Get instant match reminders, group draw announcements, referee support, and chat with fellow eFootball Mobile gamers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="https://chat.whatsapp.com/efmasters"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Official WhatsApp Group
            </a>
            <a
              href="https://discord.gg/efmasters"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center gap-2 hover:bg-indigo-500 transition-colors"
            >
              Official Discord Server
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 pt-8 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 eF Masters Arena. All rights reserved. eFootball is a registered trademark of Konami Digital Entertainment.</p>
        <div className="flex items-center justify-center gap-4 text-slate-400">
          <Link href="/tournaments" className="hover:text-cyan-400">Tournaments</Link>
          <Link href="/rankings" className="hover:text-cyan-400">Leaderboard</Link>
          <Link href="/hall-of-fame" className="hover:text-cyan-400">Hall of Fame</Link>
          <Link href="/disputes" className="hover:text-cyan-400">Rules & Disputes</Link>
        </div>
      </footer>
    </div>
  );
}
