"use client";

import { useState } from "react";
import { Trophy, Calendar, Users, Zap, Info, FileText, List, Layers, GitMerge, Megaphone, CheckCircle, CreditCard, Settings } from "lucide-react";
import { StandingsTable, type StandingRow } from "@/components/StandingsTable";
import { MatchCard, type MatchData } from "@/components/MatchCard";
import { BracketView, type BracketNodeData } from "@/components/BracketView";
import { RegistrationModal } from "@/components/RegistrationModal";
import Link from "next/link";
import Image from "next/image";

type TabId = "overview" | "rules" | "participants" | "standings" | "matches" | "bracket" | "announcements";
type RegistrationView = { status: string; finalFee: number; rejectionReason?: string | null; payment?: { status: string; rejectionReason?: string | null } | null } | null;
type TournamentView = {
  id: string; name: string; slug: string; description: string; banner: string | null; status: string; entryFee: number; currency: string;
  totalSlots: number; confirmedSlots: number; availableSlots: number; isFull: boolean; prizePool: number; championPrize: number; runnerUpPrize: number; thirdPlacePrize: number;
  format: string; organizer: string; platform: string; registrationStart: string | Date; registrationEnd: string | Date; tournamentStart: string | Date; paymentInstructions?: string | null;
  season: { name: string } | null;
  rules: { teamType: string; matchTimeMinutes: number; substitutions: number; injuries: boolean; groupExtraTime: boolean; knockoutExtraTime: boolean } | null;
  registrations: Array<{ id: string; user: { profile: { fullName: string; username: string; efootballIgn: string } | null } }>;
  groups: Array<{ id: string; name: string; standings: StandingRow[] }>;
  matches: MatchData[];
  brackets: BracketNodeData[];
  announcements: Array<{ id: string; title: string; content: string; createdAt: string | Date }>;
};

export function TournamentDetailClient({
  tournament,
  userRegistration,
  currentUserId,
  canManage,
}: {
  tournament: TournamentView;
  userRegistration: RegistrationView;
  currentUserId: string | null;
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const percentageFilled = tournament.totalSlots > 0
    ? Math.min(100, Math.round((tournament.confirmedSlots / tournament.totalSlots) * 100))
    : 0;
  const tabs: Array<{ id: TabId; label: string; icon: typeof Info }> = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "rules", label: "Rules & Settings", icon: FileText },
    { id: "participants", label: `Participants (${tournament.confirmedSlots})`, icon: List },
    { id: "standings", label: "Group Standings", icon: Layers },
    { id: "matches", label: `Matches (${tournament.matches.length})`, icon: Zap },
    { id: "bracket", label: "Knockout Bracket", icon: GitMerge },
    { id: "announcements", label: `Notices (${tournament.announcements.length})`, icon: Megaphone },
  ];

  return (
    <div className="page-container">
      {/* Header Banner Section */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl relative">
        <div className="relative min-h-80 w-full bg-slate-950 sm:h-80">
          {tournament.banner ? <Image src={tournament.banner} alt={tournament.name} fill priority sizes="(min-width: 1280px) 80rem, 100vw" className="object-cover opacity-75" /> : <div className="h-full w-full bg-gradient-to-br from-cyan-950 via-slate-950 to-emerald-950" aria-hidden="true" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>

          {/* Top Badges */}
          <div className="absolute left-4 right-4 top-4 flex min-w-0 items-start justify-between gap-2">
            <span className="max-w-[55%] truncate rounded-xl border border-white/10 bg-black/70 px-3 py-1 text-xs font-bold text-slate-300 backdrop-blur-md">
              {tournament.season?.name || "Independent tournament"}
            </span>
            <span className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1 text-[11px] font-extrabold sm:px-3 sm:text-xs ${
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
          <div className="absolute bottom-4 left-4 right-4 min-w-0 space-y-3 sm:bottom-6 sm:left-6 sm:right-6">
            <h1 className="line-clamp-3 break-words text-2xl font-black leading-tight text-white sm:text-4xl">{tournament.name}</h1>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-300 sm:gap-4 sm:text-xs">
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
        <div className="flex flex-col gap-4 border-t border-slate-800/80 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
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
          <div className="w-full sm:w-auto">
            {canManage ? (
              <Link href={`/dashboard/tournaments/${tournament.slug}`} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 sm:w-auto">
                <Settings className="h-4 w-4" /> Manage tournament
              </Link>
            ) : userRegistration && ["PENDING_PAYMENT", "REJECTED"].includes(userRegistration.status) ? (
              <button onClick={() => setRegisterModalOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 sm:w-auto">
                <CreditCard className="w-4 h-4" /> {userRegistration.status === "REJECTED" ? "Resubmit payment proof" : "Submit payment proof"}
              </button>
            ) : userRegistration ? (
              <div className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-cyan-400 sm:w-auto">
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
      <div className="custom-scrollbar flex min-w-0 snap-x snap-mandatory space-x-2 overflow-x-auto overscroll-x-contain border-b border-slate-800 pb-2" tabIndex={0} aria-label="Tournament sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
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
              <p className="whitespace-pre-line break-words text-xs leading-relaxed text-slate-300 sm:text-sm">
                {tournament.description}
              </p>
            </div>

            {/* Prize Distribution */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Prize Pool Breakdown
              </h3>
              <div className="grid grid-cols-1 gap-3 text-center min-[430px]:grid-cols-3 sm:gap-4">
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
                <div className="flex min-w-0 justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Game Platform</span>
                  <span className="min-w-0 break-words text-right font-semibold text-white">{tournament.platform}</span>
                </div>
                <div className="flex min-w-0 justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Format</span>
                  <span className="min-w-0 break-words text-right font-semibold text-white">{tournament.format.replaceAll("_", " ")}</span>
                </div>
                <div className="flex min-w-0 justify-between gap-3 border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Organizer</span>
                  <span className="min-w-0 break-words text-right font-semibold text-white">{tournament.organizer}</span>
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
          {tournament.registrations.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-400">No participants have been confirmed yet.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tournament.registrations.map((r, idx) => (
              <div key={r.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-extrabold text-cyan-400">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <Link href={`/players/${r.user.profile?.username}`} className="block truncate text-xs font-bold text-white hover:text-cyan-400">
                    {r.user.profile?.fullName} (@{r.user.profile?.username})
                  </Link>
                  <span className="block truncate text-[10px] font-mono text-slate-400">IGN: {r.user.profile?.efootballIgn}</span>
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
              {tournament.groups.map((g) => (
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
              {tournament.matches.map((m) => (
                <MatchCard key={m.id} match={m} currentUserId={currentUserId} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "bracket" && (
        <div className="min-w-0 space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
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
          {tournament.announcements.length === 0 && <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">No announcements have been posted.</div>}
          {tournament.announcements.map((a) => (
            <div key={a.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-cyan-400 font-bold">{new Date(a.createdAt).toLocaleString()}</span>
              <h4 className="break-words text-sm font-extrabold text-white">{a.title}</h4>
              <p className="break-words text-xs leading-relaxed text-slate-300">{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        tournament={tournament}
        userRegistration={userRegistration}
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
