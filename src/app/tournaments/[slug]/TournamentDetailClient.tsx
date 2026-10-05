"use client";

import { useState } from "react";
import { Trophy, Calendar, Users, Shield, Zap, Info, FileText, List, Layers, GitMerge, Megaphone, Award, CheckCircle, Clock } from "lucide-react";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchCard } from "@/components/MatchCard";
import { BracketView } from "@/components/BracketView";
import { RegistrationModal } from "@/components/RegistrationModal";
import Link from "next/link";

export function TournamentDetailClient({
  tournament,
  userRegistration,
  currentUserId,
}: {
  tournament: any;
  userRegistration: any;
  currentUserId: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "rules" | "participants" | "standings" | "matches" | "bracket" | "announcements">("overview");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const percentageFilled = Math.min(100, Math.round((tournament.confirmedSlots / tournament.totalSlots) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner Section */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl relative">
        <div className="h-64 sm:h-80 w-full relative bg-slate-950">
          <img
            src={tournament.banner || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200"}
            alt={tournament.name}
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>

          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md text-xs font-bold text-slate-300 border border-white/10">
              {tournament.season?.name || "eF Masters Cup"}
            </span>
            <span className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border ${
              tournament.status === "REGISTRATION_OPEN"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : tournament.status === "ONGOING"
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}>
              <Zap className="w-3.5 h-3.5" /> {tournament.status.replace("_", " ")}
            </span>
          </div>

          {/* Title & Stats inside banner */}
          <div className="absolute bottom-6 left-6 right-6 space-y-3">
            <h1 className="text-2xl sm:text-4xl font-black text-white">{tournament.name}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-lg border border-white/10">
                <Calendar className="w-4 h-4 text-cyan-400" /> Start: {new Date(tournament.tournamentStart).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-lg border border-white/10">
                <Trophy className="w-4 h-4 text-amber-400" /> Prize: ৳{tournament.prizePool}
              </span>
              <span className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-lg border border-white/10">
                <Users className="w-4 h-4 text-emerald-400" /> Slots: {tournament.confirmedSlots}/{tournament.totalSlots}
              </span>
            </div>
          </div>
        </div>

        {/* Slot Bar & Quick Action */}
        <div className="p-6 bg-slate-900 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:max-w-md space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Available Registration Capacity</span>
              <span className="text-cyan-400">{tournament.availableSlots} slots remaining</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${percentageFilled}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons based on User Registration state */}
          <div>
            {userRegistration ? (
              <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-cyan-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Registration Status: <span className="text-white uppercase">{userRegistration.status}</span>
              </div>
            ) : tournament.status === "REGISTRATION_OPEN" && !tournament.isFull ? (
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
              >
                Register Now ({tournament.entryFee === 0 ? "FREE" : `৳${tournament.entryFee}`})
              </button>
            ) : tournament.isFull ? (
              <span className="px-6 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold">
                Slots Full
              </span>
            ) : (
              <span className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold">
                Registration Closed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto custom-scrollbar pb-1">
        {[
          { id: "overview", label: "Overview", icon: Info },
          { id: "rules", label: "Rules & Settings", icon: FileText },
          { id: "participants", label: `Participants (${tournament.confirmedSlots})`, icon: List },
          { id: "standings", label: "Group Standings", icon: Layers },
          { id: "matches", label: `Matches (${tournament.matches.length})`, icon: Zap },
          { id: "bracket", label: "Knockout Bracket", icon: GitMerge },
          { id: "announcements", label: `Notices (${tournament.announcements.length})`, icon: Megaphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white">About the Tournament</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {tournament.description}
              </p>
            </div>

            {/* Prize Distribution */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Prize Pool Breakdown
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-2xl">🥇</span>
                  <span className="block text-xs font-bold text-amber-300 mt-1">Champion</span>
                  <span className="text-sm font-extrabold text-white">৳{tournament.championPrize}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
                  <span className="text-2xl">🥈</span>
                  <span className="block text-xs font-bold text-slate-300 mt-1">Runner-up</span>
                  <span className="text-sm font-extrabold text-white">৳{tournament.runnerUpPrize}</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-900/20 border border-amber-800/40">
                  <span className="text-2xl">🥉</span>
                  <span className="block text-xs font-bold text-amber-500 mt-1">Third Place</span>
                  <span className="text-sm font-extrabold text-white">৳{tournament.thirdPlacePrize}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Organizer Info Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">Tournament Info</h3>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Game Platform</span>
                  <span className="font-semibold text-white">{tournament.platform}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Format</span>
                  <span className="font-semibold text-white">{tournament.format.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Organizer</span>
                  <span className="font-semibold text-white">{tournament.organizer}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Reg Start</span>
                  <span className="font-semibold text-white">{new Date(tournament.registrationStart).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Reg End</span>
                  <span className="font-semibold text-white">{new Date(tournament.registrationEnd).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">Match Configuration & Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Team Type</span>
              <span className="font-bold text-white text-sm">{tournament.rules?.teamType || "Dream Team"}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Match Duration</span>
              <span className="font-bold text-white text-sm">{tournament.rules?.matchTimeMinutes || 8} Minutes</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Substitutions</span>
              <span className="font-bold text-white text-sm">{tournament.rules?.substitutions || 5} Subs</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Injuries</span>
              <span className="font-bold text-emerald-400 text-sm">{tournament.rules?.injuries ? "ON" : "OFF"}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Group Stage Extra Time</span>
              <span className="font-bold text-rose-400 text-sm">{tournament.rules?.groupExtraTime ? "ON" : "OFF"}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Knockout Extra Time & Penalty</span>
              <span className="font-bold text-emerald-400 text-sm">{tournament.rules?.knockoutExtraTime ? "ON" : "OFF"}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "participants" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Confirmed Participants List</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tournament.registrations.map((r: any, idx: number) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-extrabold text-xs flex items-center justify-center">
                  #{idx + 1}
                </span>
                <div>
                  <Link href={`/players/${r.user.profile?.username}`} className="font-bold text-xs text-white hover:text-cyan-400">
                    {r.user.profile?.fullName} (@{r.user.profile?.username})
                  </Link>
                  <span className="text-[10px] text-slate-400 block font-mono">IGN: {r.user.profile?.efootballIgn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "standings" && (
        <div className="space-y-6">
          {tournament.groups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
              Group draw has not been conducted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tournament.groups.map((g: any) => (
                <StandingsTable key={g.id} groupName={g.name} standings={g.standings} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "matches" && (
        <div className="space-y-4">
          {tournament.matches.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
              No match fixtures generated yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tournament.matches.map((m: any) => (
                <MatchCard key={m.id} match={m} currentUserId={currentUserId} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "bracket" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">Knockout Elimination Bracket</h3>
          {tournament.brackets.length === 0 ? (
            <p className="text-xs text-slate-400">Knockout bracket will be generated after group stage completion.</p>
          ) : (
            <BracketView brackets={tournament.brackets} />
          )}
        </div>
      )}

      {activeTab === "announcements" && (
        <div className="space-y-4">
          {tournament.announcements.map((a: any) => (
            <div key={a.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-cyan-400 font-bold">{new Date(a.createdAt).toLocaleString()}</span>
              <h4 className="font-extrabold text-sm text-white">{a.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        tournament={tournament}
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
