"use client";

import { MatchStatus } from "@prisma/client";
import { Trophy, CheckCircle, Clock } from "lucide-react";

export interface BracketNodeData {
  id: string;
  round: number;
  stageName: string;
  position: number;
  match?: {
    id: string;
    player1?: { profile?: { username: string; efootballIgn: string } | null } | null;
    player2?: { profile?: { username: string; efootballIgn: string } | null } | null;
    player1Score?: number | null;
    player2Score?: number | null;
    winnerId?: string | null;
    player1Id?: string | null;
    player2Id?: string | null;
    status: MatchStatus;
  } | null;
}

export function BracketView({ brackets }: { brackets: BracketNodeData[] }) {
  const qfNodes = brackets.filter((b) => b.round === 1);
  const sfNodes = brackets.filter((b) => b.round === 2);
  const finalNodes = brackets.filter((b) => b.round === 3);

  const renderMatchCard = (node: BracketNodeData) => {
    const m = node.match;
    const p1Name = m?.player1?.profile?.username || "TBD";
    const p2Name = m?.player2?.profile?.username || "TBD";
    const p1Score = m?.player1Score ?? "-";
    const p2Score = m?.player2Score ?? "-";
    const isP1Winner = m?.winnerId && m?.winnerId === m?.player1Id;
    const isP2Winner = m?.winnerId && m?.winnerId === m?.player2Id;

    return (
      <div key={node.id} className="group relative w-64 shrink-0 space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-xl transition-all hover:border-cyan-500/50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{node.stageName}</span>
          <span className="text-[10px] text-slate-500 font-mono">#{node.position}</span>
        </div>

        {/* Player 1 Row */}
        <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
          isP1Winner ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold" : "bg-slate-950/70 text-slate-300"
        }`}>
          <span className="flex min-w-0 max-w-[10rem] items-center gap-1 truncate text-xs">
            {isP1Winner && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
            {p1Name}
          </span>
          <span className="shrink-0 text-xs font-mono font-bold">{p1Score}</span>
        </div>

        {/* Player 2 Row */}
        <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
          isP2Winner ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold" : "bg-slate-950/70 text-slate-300"
        }`}>
          <span className="flex min-w-0 max-w-[10rem] items-center gap-1 truncate text-xs">
            {isP2Winner && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
            {p2Name}
          </span>
          <span className="shrink-0 text-xs font-mono font-bold">{p2Score}</span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> {m?.status || "SCHEDULED"}
          </span>
          {m?.status === "CONFIRMED" && <CheckCircle className="w-3 h-3 text-emerald-400" />}
        </div>
      </div>
    );
  };

  return (
    <div className="custom-scrollbar w-full min-w-0 overflow-x-auto overscroll-x-contain py-4 sm:py-6" tabIndex={0} aria-label="Scrollable knockout bracket">
      <div className="flex min-w-[56rem] items-center justify-between gap-8 px-2 sm:px-4">
        {/* Quarter Finals Column */}
        <div className="space-y-6">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 text-center mb-2">Quarter Finals</h4>
          {qfNodes.map((n) => renderMatchCard(n))}
        </div>

        {/* Semi Finals Column */}
        <div className="space-y-12">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 text-center mb-2">Semi Finals</h4>
          {sfNodes.map((n) => renderMatchCard(n))}
        </div>

        {/* Final Column */}
        <div className="space-y-16">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400 text-center mb-2">Grand Final 🏆</h4>
          {finalNodes.map((n) => renderMatchCard(n))}
        </div>
      </div>
    </div>
  );
}
