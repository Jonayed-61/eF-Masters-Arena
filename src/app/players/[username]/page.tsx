import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Shield, Trophy, Award, Flame, Star, Crown, MessageSquare, History, Globe } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await db.profile.findUnique({
    where: { username },
    include: {
      user: {
        include: {
          achievements: { include: { achievement: true } },
          registrations: {
            include: {
              tournament: { include: { season: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!profile) notFound();

  const totalMatches = profile.matchesPlayed || 1;
  const winRate = ((profile.matchesWon / totalMatches) * 100).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Player Header Card */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-4xl font-extrabold text-black shadow-xl shadow-cyan-500/20 shrink-0">
            {profile.username[0].toUpperCase()}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 className="text-3xl font-black text-white">{profile.fullName}</h1>
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono">
                🏆 {profile.rankingPoints} Points
              </span>
            </div>

            <p className="text-xs text-slate-400">
              @{profile.username} • {profile.country} • IGN: <strong className="text-slate-200">{profile.efootballIgn}</strong> • Team: <strong className="text-cyan-400">{profile.teamName}</strong>
            </p>

            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">{profile.bio || "No bio provided."}</p>

          </div>
        </div>
      </div>

      {/* STATISTICS GRID */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" /> Performance Statistics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-2xl font-black text-white font-mono">{profile.matchesPlayed}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Played</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-2xl font-black text-emerald-400 font-mono">{profile.matchesWon}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Wins</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-2xl font-black text-slate-400 font-mono">{profile.matchesDrawn}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Draws</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-2xl font-black text-rose-400 font-mono">{profile.matchesLost}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Losses</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-2xl font-black text-cyan-400 font-mono">{winRate}%</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Win Rate</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-2xl font-black text-amber-400 font-mono">{profile.championships} 🏆</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Titles</span>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" /> Unlocked Achievements ({profile.user.achievements.length})
        </h3>

        {profile.user.achievements.length === 0 ? (
          <p className="text-xs text-slate-400">No achievements unlocked yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {profile.user.achievements.map((item) => (
              <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shrink-0">
                  ⭐
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white">{item.achievement.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">{item.achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOURNAMENT HISTORY TIMELINE */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" /> Tournament History
        </h3>

        <div className="space-y-3">
          {profile.user.registrations.map((reg) => (
            <div key={reg.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">{reg.tournament.season?.name || "Cup"}</span>
                <Link href={`/tournaments/${reg.tournament.slug}`} className="font-extrabold text-sm text-white hover:text-cyan-400 block">
                  {reg.tournament.name}
                </Link>
              </div>
              <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
                {reg.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
