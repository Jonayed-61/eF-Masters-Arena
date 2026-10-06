"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, ExternalLink, Flag, XCircle } from "lucide-react";

function responseError(data: { error?: string | { message?: string } }) {
  return typeof data.error === "string" ? data.error : data.error?.message || "Unable to update dispute";
}

type DisputeItem = {
  id: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string | Date;
  match: { id: string; roundName: string; tournament: { name: string; slug: string } };
  reporter: { profile: { username: string; fullName: string } | null };
  reportedPlayer: { profile: { username: string; fullName: string } | null };
  evidence: { id: string; fileUrl: string }[];
};

export function DisputeAdminClient({ disputes: initialDisputes, userRole }: { disputes: DisputeItem[]; userRole: string }) {
  const [disputes, setDisputes] = useState(initialDisputes);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const resolveDispute = async (id: string, status: "RESOLVED" | "REJECTED") => {
    const decision = window.prompt("Decision note:", status === "RESOLVED" ? "Result reviewed and confirmed" : "Evidence was insufficient");
    if (!decision) return;
    setLoadingId(id);
    try {
      const response = await fetch(`/api/v1/disputes/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminDecision: decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data));
      setDisputes((current) => current.filter((dispute) => dispute.id !== id));
      setMessage("Dispute updated and audit log created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update dispute");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <main className="page-container">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">Moderation</p>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Dispute queue</h1>
          <p className="mt-2 break-words text-sm text-slate-400">Review match evidence and record a decision as {userRole.replaceAll("_", " ")}.</p>
        </div>
        <Link href="/dashboard" className="shrink-0 text-sm font-bold text-cyan-400 hover:text-cyan-300">Back to dashboard</Link>
      </header>

      {message && <p className="break-words rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">{message}</p>}

      {disputes.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400 sm:p-12">No open disputes.</div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <article key={dispute.id} className="min-w-0 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-xs font-bold uppercase tracking-wider text-cyan-400">{dispute.match.tournament.name} · {dispute.match.roundName}</p>
                  <h2 className="mt-1 break-words text-lg font-extrabold text-white">{dispute.reason}</h2>
                  <p className="mt-1 text-xs text-slate-400">{new Date(dispute.createdAt).toLocaleString()}</p>
                </div>
                <span className="self-start whitespace-nowrap rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300">{dispute.status}</span>
              </div>

              <p className="break-words text-sm leading-6 text-slate-300">{dispute.description}</p>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="min-w-0 rounded-xl bg-slate-950 p-3">
                  <span className="text-xs text-slate-500">Reporter</span>
                  <p className="mt-1 break-words font-bold text-white">{dispute.reporter.profile?.fullName || "Unknown"} <span className="break-all text-cyan-400">@{dispute.reporter.profile?.username}</span></p>
                </div>
                <div className="min-w-0 rounded-xl bg-slate-950 p-3">
                  <span className="text-xs text-slate-500">Reported player</span>
                  <p className="mt-1 break-words font-bold text-white">{dispute.reportedPlayer.profile?.fullName || "Unknown"} <span className="break-all text-cyan-400">@{dispute.reportedPlayer.profile?.username}</span></p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {dispute.evidence.map((item) => <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-700"><ExternalLink className="h-3.5 w-3.5" /> View evidence</a>)}
                <Link href={`/tournaments/${dispute.match.tournament.slug}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"><Flag className="h-3.5 w-3.5" /> Open tournament</Link>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row">
                <button disabled={loadingId === dispute.id} onClick={() => resolveDispute(dispute.id, "RESOLVED")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-black hover:bg-emerald-400 disabled:opacity-50"><CheckCircle className="h-4 w-4" /> Resolve</button>
                <button disabled={loadingId === dispute.id} onClick={() => resolveDispute(dispute.id, "REJECTED")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-extrabold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"><XCircle className="h-4 w-4" /> Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
