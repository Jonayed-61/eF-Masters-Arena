"use client";

import Link from "next/link";
import { Shield, ChevronUp } from "lucide-react";

export interface StandingRow {
  id: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  user: {
    id: string;
    profile: {
      username: string;
      efootballIgn: string;
      teamName: string;
    } | null;
  };
}

export function StandingsTable({ groupName, standings }: { groupName: string; standings: StandingRow[] }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <span className="flex min-w-0 items-center gap-1.5 break-words text-sm font-extrabold text-cyan-400">
          <Shield className="w-4 h-4 text-cyan-400" /> {groupName} Standings
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Top 2 Qualify</span>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[42rem] text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Pos</th>
              <th className="py-2.5 px-3">Player</th>
              <th className="py-2.5 px-2 text-center">P</th>
              <th className="py-2.5 px-2 text-center">W</th>
              <th className="py-2.5 px-2 text-center">D</th>
              <th className="py-2.5 px-2 text-center">L</th>
              <th className="py-2.5 px-2 text-center">GF</th>
              <th className="py-2.5 px-2 text-center">GA</th>
              <th className="py-2.5 px-2 text-center">GD</th>
              <th className="py-2.5 px-3 text-center text-cyan-400 font-extrabold">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {standings.map((st, idx) => {
              const isQualified = idx < 2;
              return (
                <tr
                  key={st.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isQualified ? "bg-cyan-500/5" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-slate-200 flex items-center gap-1">
                    {st.position}
                    {isQualified && <ChevronUp className="w-3 h-3 text-emerald-400" />}
                  </td>
                  <td className="max-w-48 py-2.5 px-3">
                    <Link
                      href={`/players/${st.user.profile?.username}`}
                      className="block truncate font-bold leading-tight text-white transition-colors hover:text-cyan-400"
                    >
                      {st.user.profile?.username || "Unknown"}
                    </Link>
                    <span className="block truncate text-[10px] text-slate-400">{st.user.profile?.teamName}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{st.played}</td>
                  <td className="py-2.5 px-2 text-center text-emerald-400 font-mono font-bold">{st.won}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{st.drawn}</td>
                  <td className="py-2.5 px-2 text-center text-rose-400 font-mono">{st.lost}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{st.goalsFor}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{st.goalsAgainst}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold">
                    {st.goalDiff > 0 ? `+${st.goalDiff}` : st.goalDiff}
                  </td>
                  <td className="py-2.5 px-3 text-center text-cyan-400 font-extrabold text-sm font-mono bg-slate-950/40">
                    {st.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
