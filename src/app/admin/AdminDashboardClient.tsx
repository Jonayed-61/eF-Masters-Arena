"use client";

import { useState } from "react";
import { LayoutDashboard, CreditCard, Trophy, CheckCircle, Zap, Shield, History, Plus, Users, AlertTriangle, ArrowRight, Settings } from "lucide-react";
import Link from "next/link";

function responseError(data: { error?: string | { message?: string } }) {
  return typeof data.error === "string" ? data.error : data.error?.message || "The request failed.";
}

type AdminStats = { totalPlayers: number; totalTournaments: number; activeTournaments: number; completedTournaments: number; totalRegistrations: number; approvedParticipants: number; totalMatches: number; pendingPayments: number; pendingMatches: number; openDisputes: number; totalRevenue: number };
type AdminPayment = { id: string; amount: number; method: string; senderNumber: string; transactionId: string; screenshot: string | null; createdAt: string | Date; user: { profile: { fullName: string; username: string } | null }; registration: { tournament: { name: string; slug: string } } };
type AdminMatch = { id: string; roundName: string; player1Id: string | null; player1: { profile: { username: string } | null } | null; player2: { profile: { username: string } | null } | null; tournament: { name: string }; submissions: Array<{ submitterId: string; playerScore: number; opponentScore: number }> };
type AdminTournament = { id: string; name: string; slug: string; status: string; entryFee: number; totalSlots: number; groupCount: number; qualifiersPerGroup: number; registrationEnd: string | Date; tournamentStart: string | Date; registrations: Array<{ id: string; status: string; payment: { status: string } | null }> };
type AdminAuditLog = { id: string; action: string; entity: string; entityId: string | null; userId: string | null; timestamp: string | Date; user: { profile: { username: string } | null } | null };

export function AdminDashboardClient({
  userRole,
  stats,
  pendingPayments,
  pendingMatches,
  tournaments,
  auditLogs,
}: {
  userRole: string;
  stats: AdminStats;
  pendingPayments: AdminPayment[];
  pendingMatches: AdminMatch[];
  tournaments: AdminTournament[];
  auditLogs: AdminAuditLog[];
}) {
  const [activeTab, setActiveTab] = useState<"payments" | "tournaments" | "matches" | "audit">(userRole === "MODERATOR" ? "matches" : "payments");
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Create Tournament Form State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTName, setNewTName] = useState("");
  const [newTSlug, setNewTSlug] = useState("");
  const [newTDesc, setNewTDesc] = useState("");
  const [newTFee, setNewTFee] = useState(0);
  const [newTPrize, setNewTPrize] = useState(0);
  const [newTSlots, setNewTSlots] = useState(32);
  const [newTMinimum, setNewTMinimum] = useState(8);
  const [newTGroups, setNewTGroups] = useState(4);
  const [newTQualifiers, setNewTQualifiers] = useState(2);
  const [newTFormat, setNewTFormat] = useState("GROUP_AND_KNOCKOUT");
  const [newTPaymentInstructions, setNewTPaymentInstructions] = useState("");
  const [newTContact, setNewTContact] = useState("");
  const [newTRegistrationStart, setNewTRegistrationStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [newTRegistrationEnd, setNewTRegistrationEnd] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
  const [newTStart, setNewTStart] = useState(() => new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 16));
  const canManageTournaments = userRole !== "MODERATOR";

  const handleApprovePayment = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/payments/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(responseError(data));
      setMsg("✅ Payment approved & slot confirmed!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to approve payment";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (id: string) => {
    const reason = prompt("Enter rejection reason:", "Invalid transaction ID or screenshot");
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/payments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(responseError(data));
      setMsg("✅ Payment rejected!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reject payment";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyMatchScore = async (matchId: string, p1Score: number, p2Score: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1Score: p1Score, player2Score: p2Score }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(responseError(data));
      setMsg("✅ Match result verified!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to verify match";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTName,
          slug: newTSlug,
          description: newTDesc,
          entryFee: Number(newTFee),
          prizePool: Number(newTPrize),
          totalSlots: Number(newTSlots),
          minimumParticipants: Number(newTMinimum),
          groupCount: Number(newTGroups),
          qualifiersPerGroup: Number(newTQualifiers),
          championPrize: Number(newTPrize) * 0.6,
          runnerUpPrize: Number(newTPrize) * 0.3,
          thirdPlacePrize: Number(newTPrize) * 0.1,
          format: newTFormat,
          paymentInstructions: newTPaymentInstructions || undefined,
          contactInfo: newTContact || undefined,
          registrationStart: new Date(newTRegistrationStart).toISOString(),
          registrationEnd: new Date(newTRegistrationEnd).toISOString(),
          tournamentStart: new Date(newTStart).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(responseError(data));
      setMsg("✅ Tournament created!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create tournament";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div className="page-hero flex flex-col justify-between gap-4 space-y-2 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="flex items-start gap-2 break-words text-2xl font-black text-white sm:items-center sm:text-3xl">
            <LayoutDashboard className="mt-0.5 h-7 w-7 shrink-0 text-amber-400 sm:h-8 sm:w-8" /> {userRole === "MODERATOR" ? "Moderation dashboard" : userRole === "SUPER_ADMIN" ? "Platform operations" : "Tournament operations"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {userRole === "MODERATOR" ? "Review disputed matches and submitted results that need intervention." : userRole === "SUPER_ADMIN" ? "Platform-wide queues, tournaments, users, and operational oversight." : "Your owned tournaments, payment reviews, results, and progression tasks."}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[390px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:self-auto">
          <Link href="/disputes" className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-extrabold text-rose-300 hover:bg-rose-500/20">
            <Shield className="w-4 h-4" /> Review Disputes
          </Link>
          {userRole === "SUPER_ADMIN" && <Link href="/dashboard/users" className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-extrabold text-amber-300 hover:bg-amber-500/20"><Users className="h-4 w-4" /> Manage users</Link>}
          {userRole === "SUPER_ADMIN" && <Link href="/dashboard/settings" className="flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-xs font-extrabold text-slate-200 hover:bg-slate-700"><Settings className="h-4 w-4" /> Platform settings</Link>}
          {canManageTournaments && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Tournament
            </button>
          )}
        </div>
      </div>

      {msg && <p className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-center">{msg}</p>}

      <section className="space-y-3" aria-labelledby="attention-heading">
        <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /><h2 id="attention-heading" className="text-lg font-extrabold text-white">Needs attention</h2></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {canManageTournaments && <button type="button" onClick={() => setActiveTab("payments")} className="flex min-h-24 items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left hover:bg-amber-500/15"><span><strong className="block text-2xl text-amber-300">{stats.pendingPayments}</strong><span className="text-sm font-bold text-white">Payments awaiting review</span></span><ArrowRight className="h-5 w-5 text-amber-300" /></button>}
          <button type="button" onClick={() => setActiveTab("matches")} className="flex min-h-24 items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-left hover:bg-cyan-500/15"><span><strong className="block text-2xl text-cyan-300">{stats.pendingMatches}</strong><span className="text-sm font-bold text-white">Results awaiting review</span></span><ArrowRight className="h-5 w-5 text-cyan-300" /></button>
          <Link href="/disputes" className="flex min-h-24 items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 hover:bg-rose-500/15"><span><strong className="block text-2xl text-rose-300">{stats.openDisputes}</strong><span className="text-sm font-bold text-white">Open disputes</span></span><ArrowRight className="h-5 w-5 text-rose-300" /></Link>
        </div>
      </section>

      {/* METRICS CARDS GRID */}
      {canManageTournaments && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-white font-mono">{userRole === "SUPER_ADMIN" ? stats.totalPlayers : stats.approvedParticipants}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">{userRole === "SUPER_ADMIN" ? "Players" : "Approved players"}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-cyan-400 font-mono">{stats.totalTournaments}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Tournaments</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-emerald-400 font-mono">{stats.activeTournaments}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Live Tourneys</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-amber-400 font-mono">{stats.totalRegistrations}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Registrations</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-rose-400 font-mono">{stats.totalMatches}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Matches</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-emerald-400 font-mono">{userRole === "SUPER_ADMIN" ? stats.completedTournaments : `৳${stats.totalRevenue}`}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">{userRole === "SUPER_ADMIN" ? "Completed" : "Entry revenue"}</span>
        </div>
      </div>}

      {/* Tabs */}
      <div className="custom-scrollbar flex min-w-0 snap-x snap-mandatory space-x-2 overflow-x-auto overscroll-x-contain border-b border-slate-800 pb-2" tabIndex={0} aria-label="Admin dashboard sections">
        {canManageTournaments && <button
          onClick={() => setActiveTab("payments")}
          className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "payments" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Pending Payments ({pendingPayments.length})
        </button>}
        {canManageTournaments && <button
          onClick={() => setActiveTab("tournaments")}
          className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "tournaments" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Trophy className="w-4 h-4" /> Tournament Manager ({tournaments.length})
        </button>}
        <button
          onClick={() => setActiveTab("matches")}
          className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "matches" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" /> Match Submissions ({pendingMatches.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "audit" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" /> {userRole === "SUPER_ADMIN" ? "Audit Logs" : "Recent Activity"}
        </button>
      </div>

      {/* TAB 1: PENDING PAYMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Payment Verification Queue</h3>
          {pendingPayments.length === 0 ? (
            <p className="text-xs text-slate-400 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              No pending payments to review.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingPayments.map((p) => (
                <div key={p.id} className="min-w-0 space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex min-w-0 justify-between gap-3 text-xs">
                    <span className="min-w-0 break-words font-extrabold text-cyan-400">{p.registration.tournament.name}</span>
                    <span className="font-mono text-emerald-400 font-bold">৳{p.amount}</span>
                  </div>
                  <div className="space-y-1 break-words text-xs text-slate-300">
                    <p>Player: <strong className="text-white">{p.user.profile?.fullName} (@{p.user.profile?.username})</strong></p>
                    <p>Method: <strong>{p.method}</strong> • Sender: <span className="font-mono font-bold text-white">{p.senderNumber}</span></p>
                    <p>TrxID: <span className="font-mono font-bold text-amber-400">{p.transactionId}</span></p>
                    <p>Submitted: <time dateTime={new Date(p.createdAt).toISOString()}>{new Date(p.createdAt).toLocaleString()}</time></p>
                    <Link href={`/dashboard/tournaments/${p.registration.tournament.slug}`} className="block text-[11px] font-bold text-cyan-400 hover:underline">Open registration context</Link>
                    {p.screenshot && (
                      <a href={p.screenshot} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline block text-[11px]">
                        View Screenshot Link
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 pt-2 min-[390px]:flex-row">
                    <button
                      onClick={() => handleApprovePayment(p.id)}
                      disabled={actionLoading}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve & Confirm Slot
                    </button>
                    <button
                      onClick={() => handleRejectPayment(p.id)}
                      disabled={actionLoading}
                      className="py-2 px-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TOURNAMENT MANAGER */}
      {activeTab === "tournaments" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">My tournaments</h3>
          <div className="space-y-4">
            {tournaments.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">No tournaments have been created yet.</p>}
            {tournaments.map((t) => (
              <div key={t.id} className="min-w-0 space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="break-words text-base font-extrabold text-white">{t.name}</h4>
                    <span className="text-xs text-slate-400 font-mono">Approved: {t.registrations.filter((registration) => registration.status === "APPROVED").length}/{t.totalSlots} · Entry: ৳{t.entryFee}</span>
                    <span className="mt-1 block text-xs text-slate-500">{t.status === "REGISTRATION_OPEN" ? `Registration closes ${new Date(t.registrationEnd).toLocaleDateString()}` : `Tournament starts ${new Date(t.tournamentStart).toLocaleDateString()}`} · {t.registrations.filter((registration) => registration.payment && ["PENDING", "UNDER_REVIEW"].includes(registration.payment.status)).length} payment actions</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-800 text-cyan-400 text-xs font-bold font-mono self-start sm:self-auto">
                    {t.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Link href={`/dashboard/tournaments/${t.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-extrabold text-slate-950 hover:bg-cyan-400">Manage tournament <ArrowRight className="h-4 w-4" /></Link>
                  <Link href={`/tournaments/${t.slug}`} className="inline-flex min-h-10 items-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">Public page</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MATCH SUBMISSIONS */}
      {activeTab === "matches" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Submitted Match Results Queue</h3>
          {pendingMatches.length === 0 ? (
            <p className="text-xs text-slate-400 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              No match scores pending verification.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingMatches.map((m) => {
                const sub = m.submissions[0];
                return (
                  <div key={m.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                    <div className="min-w-0">
                      <span className="block break-words font-bold text-cyan-400">{m.tournament.name} • {m.roundName}</span>
                      <span className="text-white">
                        {m.player1?.profile?.username} vs {m.player2?.profile?.username}
                      </span>
                      {sub && (
                        <span className="text-slate-400 block mt-0.5">
                          Submitted Score: <strong className="text-amber-400 font-mono">{sub.submitterId === m.player1Id ? `${sub.playerScore} - ${sub.opponentScore}` : `${sub.opponentScore} - ${sub.playerScore}`}</strong>
                        </span>
                      )}
                    </div>
                    {sub && (
                      <button
                        onClick={() => handleVerifyMatchScore(
                          m.id,
                          sub.submitterId === m.player1Id ? sub.playerScore : sub.opponentScore,
                          sub.submitterId === m.player1Id ? sub.opponentScore : sub.playerScore,
                        )}
                        className="min-h-10 shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-black"
                      >
                        Verify Score
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">{userRole === "SUPER_ADMIN" ? "Platform audit trail" : "Your recent activity"}</h3>
          <div className="space-y-2 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                <div className="min-w-0 break-words">
                  <span className="font-mono text-cyan-400 font-bold mr-2">[{log.action}]</span>
                  <span className="text-slate-300">{log.entity} #{log.entityId}</span>
                  <span className="text-slate-500 block text-[10px]">By: {log.user?.profile?.username || log.userId || "System"}</span>
                </div>
                <span className="shrink-0 text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {createModalOpen && (
        <div className="dialog-backdrop">
          <div className="dialog-panel max-w-lg">
            <h4 className="shrink-0 border-b border-slate-800 px-4 py-4 text-base font-extrabold text-white sm:px-6">Create New Tournament</h4>
            <form onSubmit={handleCreateTournament} className="custom-scrollbar min-h-0 space-y-3 overflow-y-auto p-4 sm:p-6">
              <div>
                <label className="text-xs text-slate-300">Tournament Name</label>
                <input
                  type="text"
                  required
                  placeholder="National Mobile Championship"
                  value={newTName}
                  onChange={(e) => {
                    setNewTName(e.target.value);
                    setNewTSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Slug</label>
                <input
                  type="text"
                  required
                  value={newTSlug}
                  onChange={(e) => setNewTSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Description</label>
                <textarea
                  required
                  rows={2}
                  value={newTDesc}
                  onChange={(e) => setNewTDesc(e.target.value)}
                  placeholder="Competitive tournament description..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                ></textarea>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-3">
                <div>
                  <label className="text-xs text-slate-300">Entry Fee (৳)</label>
                  <input
                    type="number"
                    value={newTFee}
                    onChange={(e) => setNewTFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Prize Pool (৳)</label>
                  <input
                    type="number"
                    value={newTPrize}
                    onChange={(e) => setNewTPrize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Slots Capacity</label>
                  <input
                    type="number"
                    value={newTSlots}
                    onChange={(e) => setNewTSlots(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>
              <div><label className="text-xs text-slate-300">Tournament format</label><select value={newTFormat} onChange={(e) => setNewTFormat(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"><option value="GROUP_AND_KNOCKOUT">Groups and knockout</option><option value="GROUP_STAGE">Group stage only</option><option value="SINGLE_ELIMINATION">Single elimination</option><option value="LEAGUE">League</option></select></div>
              <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-3">
                <div>
                  <label className="text-xs text-slate-300">Minimum players</label>
                  <input type="number" min={2} max={newTSlots} value={newTMinimum} onChange={(e) => setNewTMinimum(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Groups</label>
                  <input type="number" min={1} max={8} value={newTGroups} onChange={(e) => setNewTGroups(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Qualifiers/group</label>
                  <input type="number" min={1} max={4} value={newTQualifiers} onChange={(e) => setNewTQualifiers(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div><label className="text-xs text-slate-300">Registration opens</label><input type="datetime-local" required value={newTRegistrationStart} onChange={(e) => setNewTRegistrationStart(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" /></div>
                <div><label className="text-xs text-slate-300">Registration closes</label><input type="datetime-local" required value={newTRegistrationEnd} onChange={(e) => setNewTRegistrationEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" /></div>
                <div><label className="text-xs text-slate-300">Tournament starts</label><input type="datetime-local" required value={newTStart} onChange={(e) => setNewTStart(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" /></div>
              </div>
              {newTFee > 0 && <div><label className="text-xs text-slate-300">Payment instructions</label><textarea required rows={3} value={newTPaymentInstructions} onChange={(e) => setNewTPaymentInstructions(e.target.value)} placeholder="List accepted methods, recipient account, reference format, and verification expectations." className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" /></div>}
              <div><label className="text-xs text-slate-300">Contact information</label><input value={newTContact} onChange={(e) => setNewTContact(e.target.value)} placeholder="Support email, phone, or community link" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" /></div>
              <div className="flex flex-col-reverse gap-2 pt-2 min-[390px]:flex-row">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-black text-xs font-bold"
                >
                  {actionLoading ? "Creating..." : "Create Tournament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
