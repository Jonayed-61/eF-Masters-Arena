import { db } from "@/lib/db";
import { Sparkles, Trophy, Calendar, Award } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function HallOfFamePage() {
  const hallOfFame = await db.hallOfFame.findMany({
    include: {
      tournament: { select: { id: true, name: true, slug: true, banner: true, season: true } },
      champion: { include: { profile: true } },
      runnerUp: { include: { profile: true } },
      thirdPlace: { include: { profile: true } },
    },
    orderBy: { dateCompleted: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-emerald-400" /> Hall of Fame
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Honoring historic champions and top finishers across all eF Masters tournament seasons.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hallOfFame.map((item) => (
          <div key={item.id} className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl space-y-4">
            <div className="h-40 relative bg-slate-950">
              <img
                src={item.tournament.banner || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200"}
                alt={item.tournament.name}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
              <div className="absolute bottom-3 left-4 right-4">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  {item.tournament.season?.name || "Official Cup"}
                </span>
                <Link href={`/tournaments/${item.tournament.slug}`} className="text-lg font-black text-white hover:text-cyan-400 block line-clamp-1">
                  {item.tournament.name}
                </Link>
              </div>
            </div>

            <div className="p-6 space-y-3 pt-0">
              {/* Champion Card */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-amber-400 block">👑 Champion</span>
                  <Link href={`/players/${item.champion.profile?.username}`} className="font-extrabold text-sm text-white hover:underline">
                    {item.champion.profile?.fullName} (@{item.champion.profile?.username})
                  </Link>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">Prize ৳{item.prizePool}</span>
              </div>

              {/* Runner Up & 3rd Place Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">🥈 Runner-up</span>
                  <Link href={`/players/${item.runnerUp.profile?.username}`} className="font-bold text-slate-200 hover:text-white">
                    {item.runnerUp.profile?.username}
                  </Link>
                </div>
                {item.thirdPlace && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">🥉 Third Place</span>
                    <Link href={`/players/${item.thirdPlace.profile?.username}`} className="font-bold text-slate-200 hover:text-white">
                      {item.thirdPlace.profile?.username}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
