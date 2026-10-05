import { db } from "@/lib/db";
import { Shield, Search, Trophy, Medal } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { q } = params;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 50;
  const where = q
    ? {
        OR: [
          { username: { contains: q } },
          { fullName: { contains: q } },
          { teamName: { contains: q } },
          { efootballIgn: { contains: q } },
        ],
      }
    : undefined;

  const profiles = await db.profile.findMany({
    where,
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: [
      { rankingPoints: "desc" },
      { championships: "desc" },
      { matchesWon: "desc" },
    ],
  });
  const totalPlayers = await db.profile.count({ where });
  const totalPages = Math.ceil(totalPlayers / pageSize);

  const top3 = page === 1 ? profiles.slice(0, 3) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Shield className="w-8 h-8 text-amber-400" /> Global Leaderboard & Rankings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Official eF Masters Arena player rankings based on tournament achievements and match performance.
        </p>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3[1] && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-700/80 text-center space-y-2 relative">
              <span className="text-3xl">🥈</span>
              <span className="text-xs font-bold text-slate-400 block uppercase">Rank #2</span>
              <h3 className="font-extrabold text-white text-base">{top3[1].fullName}</h3>
              <p className="text-xs text-slate-400">@{top3[1].username}</p>
              <span className="text-sm font-extrabold text-amber-400 block font-mono">🏆 {top3[1].rankingPoints} pts</span>
            </div>
          )}
          {top3[0] && (
            <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-500/40 text-center space-y-2 relative -translate-y-2 shadow-2xl shadow-amber-500/10">
              <span className="text-4xl">👑</span>
              <span className="text-xs font-extrabold text-amber-400 block uppercase tracking-wider">Rank #1 Champion</span>
              <h3 className="font-black text-white text-lg">{top3[0].fullName}</h3>
              <p className="text-xs text-slate-300">@{top3[0].username}</p>
              <span className="text-base font-black text-amber-300 block font-mono">🏆 {top3[0].rankingPoints} pts</span>
            </div>
          )}
          {top3[2] && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-800/40 text-center space-y-2">
              <span className="text-3xl">🥉</span>
              <span className="text-xs font-bold text-amber-600 block uppercase">Rank #3</span>
              <h3 className="font-extrabold text-white text-base">{top3[2].fullName}</h3>
              <p className="text-xs text-slate-400">@{top3[2].username}</p>
              <span className="text-sm font-extrabold text-amber-400 block font-mono">🏆 {top3[2].rankingPoints} pts</span>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <form method="GET" className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Search player name, IGN, or team..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-400 outline-none"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300">
          Search
        </button>
      </form>

      {/* Full Leaderboard Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-3 text-center">Played</th>
                <th className="py-3 px-3 text-center">Wins</th>
                <th className="py-3 px-3 text-center">Championships</th>
                <th className="py-3 px-4 text-right text-amber-400 font-extrabold">Ranking Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {profiles.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-200">#{(page - 1) * pageSize + idx + 1}</td>
                  <td className="py-3 px-4">
                    <Link href={`/players/${p.username}`} className="font-bold text-white hover:text-cyan-400">
                      {p.fullName} (@{p.username})
                    </Link>
                    <span className="text-[10px] text-slate-400 block font-mono">IGN: {p.efootballIgn}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{p.teamName}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">{p.matchesPlayed}</td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">{p.matchesWon}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">{p.championships} 🏆</td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-400 text-sm">
                    {p.rankingPoints} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {profiles.length === 0 && (
        <p className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400">
          No players match this search.
        </p>
      )}
      {totalPages > 1 && (
        <nav aria-label="Leaderboard pages" className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Page {page} of {totalPages} · {totalPlayers} players</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="rounded-lg border border-slate-700 px-3 py-2" href={`/rankings?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page - 1}`}>Previous</Link>}
            {page < totalPages && <Link className="rounded-lg border border-slate-700 px-3 py-2" href={`/rankings?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page + 1}`}>Next</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
