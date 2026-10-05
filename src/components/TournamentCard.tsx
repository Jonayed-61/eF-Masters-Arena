"use client";

import Link from "next/link";
import { Trophy, Users, Calendar, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export interface TournamentCardProps {
  id: string;
  name: string;
  slug: string;
  banner?: string | null;
  season?: { name: string } | null;
  status: string;
  entryFee: number;
  currency: string;
  totalSlots: number;
  confirmedSlots: number;
  availableSlots: number;
  isFull: boolean;
  prizePool: number;
  format: string;
  tournamentStart: string | Date;
}

export function TournamentCard({ tournament }: { tournament: TournamentCardProps }) {
  const getStatusBadge = (status: string, isFull: boolean) => {
    if (status === "REGISTRATION_OPEN") {
      if (isFull) {
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Slots Full
          </span>
        );
      }
      return (
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Registration Open
        </span>
      );
    }
    if (status === "UPCOMING") {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Upcoming
        </span>
      );
    }
    if (status === "ONGOING") {
      return (
        <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-bold flex items-center gap-1">
          <Zap className="w-3 h-3 text-cyan-400" /> Matches Live
        </span>
      );
    }
    if (status === "COMPLETED") {
      return (
        <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Completed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold">
        {status}
      </span>
    );
  };

  const percentageFilled = Math.min(100, Math.round((tournament.confirmedSlots / tournament.totalSlots) * 100));

  return (
    <div className="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 overflow-hidden shadow-xl flex flex-col justify-between hover:shadow-cyan-500/10">
      {/* Card Header & Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-950">
        <img
          src={tournament.banner || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200"}
          alt={tournament.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-semibold text-slate-300 border border-white/10">
            {tournament.season?.name || "Official Cup"}
          </span>
          {getStatusBadge(tournament.status, tournament.isFull)}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
            {tournament.name}
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            {new Date(tournament.tournamentStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Card Details Body */}
      <div className="p-4 space-y-4">
        {/* Entry & Prize Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Entry Fee</span>
            <p className="text-sm font-extrabold text-white">
              {tournament.entryFee === 0 ? <span className="text-emerald-400">FREE</span> : `৳${tournament.entryFee}`}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Prize Pool</span>
            <p className="text-sm font-extrabold text-amber-400">
              ৳{tournament.prizePool.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Slot Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Confirmed Slots
            </span>
            <span className="text-white">
              <span className="text-cyan-400">{tournament.confirmedSlots}</span> / {tournament.totalSlots}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                tournament.isFull
                  ? "bg-rose-500"
                  : percentageFilled > 75
                  ? "bg-amber-400"
                  : "bg-gradient-to-r from-cyan-500 to-emerald-400"
              }`}
              style={{ width: `${percentageFilled}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-500 text-right">
            {tournament.availableSlots} available slots left
          </p>
        </div>

        {/* Action Button */}
        <Link
          href={`/tournaments/${tournament.slug}`}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            tournament.status === "REGISTRATION_OPEN" && !tournament.isFull
              ? "bg-gradient-to-r from-cyan-500 to-emerald-400 text-black hover:from-cyan-400 hover:to-emerald-300 shadow-lg shadow-cyan-500/20"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
        >
          {tournament.status === "REGISTRATION_OPEN" && !tournament.isFull ? "Register Now" : "View Tournament"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
