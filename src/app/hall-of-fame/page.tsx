import { db } from "@/lib/db";
import { Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
    <div className="page-container">
      <div className="page-hero space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
          <Sparkles className="h-7 w-7 shrink-0 text-emerald-400 sm:h-8 sm:w-8" /> Hall of Fame
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Honoring historic champions and top finishers across all eF Masters tournament seasons.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hallOfFame.length === 0 && <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center md:col-span-2 sm:p-12"><Trophy className="mx-auto mb-3 h-10 w-10 text-slate-600" /><h2 className="font-bold text-white">No champions have been recorded.</h2><p className="mt-1 text-xs text-slate-400">Completed tournaments will appear here.</p></div>}
        {hallOfFame.map((item) => (
          <div key={item.id} className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl space-y-4">
            <div className="h-40 relative bg-slate-950">
              {item.tournament.banner ? <Image src={item.tournament.banner} alt={item.tournament.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover opacity-60" /> : <div className="h-full w-full bg-gradient-to-br from-cyan-950 via-slate-950 to-emerald-950" aria-hidden="true" />}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
              <div className="absolute bottom-3 left-4 right-4">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  {item.tournament.season?.name || "Independent tournament"}
                </span>
                <Link href={`/tournaments/${item.tournament.slug}`} className="text-lg font-black text-white hover:text-cyan-400 block line-clamp-1">
                  {item.tournament.name}
                </Link>
              </div>
            </div>

            <div className="p-6 space-y-3 pt-0">
              {/* Champion Card */}
              <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-extrabold text-amber-400 block">👑 Champion</span>
                  <Link href={`/players/${item.champion.profile?.username}`} className="block break-words text-sm font-extrabold text-white hover:underline">
                    {item.champion.profile?.fullName} (@{item.champion.profile?.username})
                  </Link>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">Prize ৳{item.prizePool}</span>
              </div>

              {/* Runner Up & 3rd Place Grid */}
              <div className="grid grid-cols-1 gap-3 text-xs min-[390px]:grid-cols-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">🥈 Runner-up</span>
                  <Link href={`/players/${item.runnerUp.profile?.username}`} className="block break-all font-bold text-slate-200 hover:text-white">
                    {item.runnerUp.profile?.username}
                  </Link>
                </div>
                {item.thirdPlace && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">🥉 Third Place</span>
                    <Link href={`/players/${item.thirdPlace.profile?.username}`} className="block break-all font-bold text-slate-200 hover:text-white">
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
