import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { Flag, CheckCircle } from "lucide-react";
import { DisputeAdminClient } from "../admin/disputes/DisputeAdminClient";

export const revalidate = 0;

export default async function DisputesPage() {
  const session = await getSession();

  type DisputeWithDetails = Prisma.DisputeGetPayload<{
    include: {
      match: { include: { tournament: true } };
      reporter: { include: { profile: true } };
      reportedPlayer: { include: { profile: true } };
      evidence: true;
    };
  }>;
  let disputes: DisputeWithDetails[];
  if (session && (session.role === "SUPER_ADMIN" || session.role === "TOURNAMENT_ADMIN" || session.role === "MODERATOR")) {
    disputes = await db.dispute.findMany({
      where: session.role === "TOURNAMENT_ADMIN"
        ? { status: { in: ["OPEN", "UNDER_REVIEW"] }, match: { tournament: { createdById: session.userId } } }
        : { status: { in: ["OPEN", "UNDER_REVIEW"] } },
      include: {
        match: { include: { tournament: true } },
        reporter: { include: { profile: true } },
        reportedPlayer: { include: { profile: true } },
        evidence: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (session) {
    disputes = await db.dispute.findMany({
      where: {
        OR: [{ reporterId: session.userId }, { reportedPlayerId: session.userId }],
      },
      include: {
        match: { include: { tournament: true } },
        reporter: { include: { profile: true } },
        reportedPlayer: { include: { profile: true } },
        evidence: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    disputes = [];
  }

  if (session && (session.role === "SUPER_ADMIN" || session.role === "TOURNAMENT_ADMIN" || session.role === "MODERATOR")) {
    return <DisputeAdminClient disputes={disputes} userRole={session.role} />;
  }

  return (
    <div className="page-container">
      <div className="page-hero space-y-2">
        <h1 className="flex items-start gap-2 break-words text-2xl font-black text-white sm:items-center sm:text-3xl">
          <Flag className="mt-0.5 h-7 w-7 shrink-0 text-rose-400 sm:h-8 sm:w-8" /> Fair Play & Dispute Resolution Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Track and review filed match disputes, cheating reports, and administrator decisions.
        </p>
      </div>

      {!session ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <p className="text-sm font-semibold text-slate-300">Please sign in to view your filed match disputes.</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No Open Disputes</h3>
          <p className="text-xs text-slate-400">All competitive matches have clean fair-play records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-cyan-400">{d.match.tournament.name} • {d.match.roundName}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  d.status === "RESOLVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {d.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Reporter:</span>
                  <span className="font-bold text-white">{d.reporter.profile?.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Reported Player:</span>
                  <span className="font-bold text-white">{d.reportedPlayer.profile?.username}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-rose-400">Reason: {d.reason}</span>
                <p className="break-words text-slate-300">{d.description}</p>
              </div>

              {d.adminDecision && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                  <span className="font-bold text-emerald-300">⚖️ Admin Decision: {d.adminDecision}</span>
                  {d.adminNotes && <p className="break-words text-slate-300">{d.adminNotes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
