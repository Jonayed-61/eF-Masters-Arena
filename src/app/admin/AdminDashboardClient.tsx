"use client";

import { useState } from "react";
import { LayoutDashboard, CreditCard, Trophy, CheckCircle, XCircle, Zap, Shield, History, Plus, Play, Layers, GitMerge } from "lucide-react";
import Link from "next/link";

export function AdminDashboardClient({
  userRole,
  stats,
  pendingPayments,
  pendingMatches,
  tournaments,
  auditLogs,
}: {
  userRole: string;
  stats: any;
  pendingPayments: any[];
  pendingMatches: any[];
  tournaments: any[];
  auditLogs: any[];
}) {
  const [activeTab, setActiveTab] = useState<"payments" | "tournaments" | "matches" | "audit">("payments");
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Create Tournament Form State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTName, setNewTName] = useState("");
  const [newTSlug, setNewTSlug] = useState("");
  const [newTDesc, setNewTDesc] = useState("");
  const [newTFee, setNewTFee] = useState(50);
  const [newTPrize, setNewTPrize] = useState(1000);
  const [newTSlots, setNewTSlots] = useState(32);
  const [newTFormat, setNewTFormat] = useState("GROUP_AND_KNOCKOUT");
  const canManageTournaments = userRole !== "MODERATOR";

  const handleApprovePayment = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/payments/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
      if (!res.ok) throw new Error(data.error);
      setMsg("✅ Payment rejected!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reject payment";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (slug: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const isCompleting = newStatus === "COMPLETED";
      const res = await fetch(
        isCompleting ? `/api/v1/tournaments/${slug}/complete` : `/api/v1/tournaments/${slug}`,
        isCompleting
          ? { method: "POST" }
          : {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✅ Tournament status updated to ${newStatus}`);
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update status";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateGroups = async (slug: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/tournaments/${slug}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupCount: 4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✅ Groups generated!`);
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate groups";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateFixtures = async (slug: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/tournaments/${slug}/fixtures`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✅ Round-robin fixtures generated!`);
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate fixtures";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBracket = async (slug: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/tournaments/${slug}/bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topPerGroup: 2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✅ Knockout bracket generated!`);
      window.location.reload();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate bracket";
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
      if (!res.ok) throw new Error(data.error);
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
          championPrize: Number(newTPrize) * 0.6,
          runnerUpPrize: Number(newTPrize) * 0.3,
          thirdPlacePrize: Number(newTPrize) * 0.1,
          format: newTFormat,
          registrationStart: new Date().toISOString(),
          registrationEnd: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          tournamentStart: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-amber-400" /> Admin Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Authenticated as <strong className="text-amber-400 uppercase">{userRole}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link href="/admin/disputes" className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-extrabold text-xs flex items-center gap-2 hover:bg-rose-500/20">
            <Shield className="w-4 h-4" /> Review Disputes
          </Link>
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

      {/* METRICS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-white font-mono">{stats.totalPlayers}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Players</span>
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
          <span className="text-2xl font-black text-amber-400 font-mono">{stats.pendingPayments}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Pending Payments</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-rose-400 font-mono">{stats.pendingMatches}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Pending Results</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-2xl font-black text-emerald-400 font-mono">৳{stats.totalRevenue}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-1">Entry Revenue</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "payments" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Pending Payments ({pendingPayments.length})
        </button>
        <button
          onClick={() => setActiveTab("tournaments")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "tournaments" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Trophy className="w-4 h-4" /> Tournament Manager ({tournaments.length})
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "matches" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" /> Match Submissions ({pendingMatches.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "audit" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" /> Audit Logs
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
                <div key={p.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-extrabold text-cyan-400">{p.registration.tournament.name}</span>
                    <span className="font-mono text-emerald-400 font-bold">৳{p.amount}</span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>Player: <strong className="text-white">{p.user.profile?.fullName} (@{p.user.profile?.username})</strong></p>
                    <p>Method: <strong>{p.method}</strong> • Sender: <span className="font-mono font-bold text-white">{p.senderNumber}</span></p>
                    <p>TrxID: <span className="font-mono font-bold text-amber-400">{p.transactionId}</span></p>
                    {p.screenshot && (
                      <a href={p.screenshot} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline block text-[11px]">
                        View Screenshot Link
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
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
          <h3 className="text-lg font-bold text-white">Tournaments Engine Controls</h3>
          <div className="space-y-4">
            {tournaments.map((t) => (
              <div key={t.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-extrabold text-base text-white">{t.name}</h4>
                    <span className="text-xs text-slate-400 font-mono">Slug: {t.slug} • Entry: ৳{t.entryFee} • Slots: {t.registrations.length}/{t.totalSlots}</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-slate-800 text-cyan-400 text-xs font-bold font-mono self-start sm:self-auto">
                    {t.status}
                  </span>
                </div>

                {/* Engine Generation Controls */}
                {canManageTournaments && <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleUpdateStatus(t.slug, "REGISTRATION_OPEN")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500/30"
                  >
                    Open Reg
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(t.slug, "ONGOING")}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold hover:bg-cyan-500/30"
                  >
                    Start Matches (ONGOING)
                  </button>
                  <button
                    onClick={() => handleGenerateGroups(t.slug)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Draw Groups
                  </button>
                  <button
                    onClick={() => handleGenerateFixtures(t.slug)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" /> Generate Fixtures
                  </button>
                  <button
                    onClick={() => handleGenerateBracket(t.slug)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center gap-1"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-amber-400" /> Draw Knockout Bracket
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(t.slug, "COMPLETED")}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold hover:bg-purple-500/30"
                  >
                    Complete Tournament
                  </button>
                </div>}
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
                  <div key={m.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-cyan-400 block">{m.tournament.name} • {m.roundName}</span>
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
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs"
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
          <h3 className="text-lg font-bold text-white">System Audit Log Trail</h3>
          <div className="space-y-2 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-cyan-400 font-bold mr-2">[{log.action}]</span>
                  <span className="text-slate-300">{log.entity} #{log.entityId}</span>
                  <span className="text-slate-500 block text-[10px]">By: {log.user?.profile?.username || log.userId || "System"}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="font-extrabold text-white text-base">Create New Tournament</h4>
            <form onSubmit={handleCreateTournament} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300">Tournament Name</label>
                <input
                  type="text"
                  required
                  placeholder="eF Masters Season 4 Champions Cup"
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
              <div className="grid grid-cols-3 gap-2">
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
              <div className="flex gap-2 pt-2">
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
