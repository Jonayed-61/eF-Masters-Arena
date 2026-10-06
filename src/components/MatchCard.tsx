"use client";

import { useState } from "react";
import { MatchStatus } from "@prisma/client";
import { Calendar, Send, Flag, AlertTriangle, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export interface MatchData {
  id: string;
  roundName: string;
  player1Id?: string | null;
  player2Id?: string | null;
  player1Score?: number | null;
  player2Score?: number | null;
  winnerId?: string | null;
  scheduledTime?: string | Date | null;
  status: MatchStatus;
  player1?: { id: string; profile: { username: string; efootballIgn: string } | null } | null;
  player2?: { id: string; profile: { username: string; efootballIgn: string } | null } | null;
}

function responseError(data: { error?: string | { message?: string } }, fallback: string) {
  return typeof data.error === "string" ? data.error : data.error?.message || fallback;
}

export function MatchCard({
  match,
  currentUserId,
  onRefresh,
}: {
  match: MatchData;
  currentUserId?: string | null;
  onRefresh?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [notes, setNotes] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const p1Name = match.player1?.profile?.username || "TBD";
  const p2Name = match.player2?.profile?.username || "TBD";
  const isP1 = currentUserId && match.player1Id === currentUserId;
  const isP2 = currentUserId && match.player2Id === currentUserId;
  const isPlayerInMatch = isP1 || isP2;

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!screenshotFile) throw new Error("Please upload the match result screenshot.");
      setUploading(true);
      const uploadBody = new FormData();
      uploadBody.append("file", screenshotFile);
      uploadBody.append("type", "match");
      const uploadRes = await fetch("/api/v1/uploads/payment-screenshot", { method: "POST", body: uploadBody });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(responseError(uploadData, "Screenshot upload failed"));
      setUploading(false);

      const res = await fetch(`/api/v1/matches/${match.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerScore: Number(playerScore),
          opponentScore: Number(opponentScore),
          screenshot: uploadData.url,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Result submission failed"));
      setMsg("✅ Result submitted successfully!");
      if (onRefresh) onRefresh();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit result";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const handleScreenshotChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("❌ Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg("❌ Screenshot must be smaller than 5MB.");
      return;
    }
    setMsg("");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const reportedPlayerId = isP1 ? match.player2Id : match.player1Id;
      let evidenceUrl: string | undefined;
      if (disputeEvidence) {
        const uploadBody = new FormData();
        uploadBody.append("file", disputeEvidence);
        uploadBody.append("type", "dispute");
        const uploadResponse = await fetch("/api/v1/uploads/payment-screenshot", { method: "POST", body: uploadBody });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(responseError(uploadData, "Evidence upload failed"));
        evidenceUrl = uploadData.url;
      }
      const res = await fetch(`/api/v1/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          reportedPlayerId,
          reason: disputeReason,
          description: disputeDesc,
          evidenceUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Dispute submission failed"));
      setMsg("✅ Dispute reported to admins!");
      if (onRefresh) onRefresh();
      setTimeout(() => setShowDisputeModal(false), 1500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to file dispute";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="min-w-0 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl transition-all hover:border-slate-700">
      {/* Header */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs">
        <span className="min-w-0 break-words font-bold uppercase tracking-wider text-cyan-400">{match.roundName}</span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300">
          <Calendar className="w-3 h-3 text-cyan-400" />
          {match.scheduledTime ? new Date(match.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Scheduled"}
        </span>
      </div>

      {/* Players Matchup Grid */}
      <div className="grid grid-cols-7 items-center gap-2 text-center py-2">
        {/* Player 1 */}
        <div className="col-span-3 flex min-w-0 flex-col items-center">
          <Link href={`/players/${p1Name}`} className="font-bold text-sm text-white hover:text-cyan-400 truncate max-w-full">
            {p1Name}
          </Link>
          <span className="block max-w-full truncate text-[10px] text-slate-400">{match.player1?.profile?.efootballIgn}</span>
        </div>

        {/* Score / VS */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {match.status === "CONFIRMED" || match.status === "RESULT_SUBMITTED" ? (
            <span className="whitespace-nowrap rounded-xl border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-sm font-extrabold text-cyan-400 sm:px-2.5">
              {match.player1Score ?? 0} - {match.player2Score ?? 0}
            </span>
          ) : (
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">VS</span>
          )}
        </div>

        {/* Player 2 */}
        <div className="col-span-3 flex min-w-0 flex-col items-center">
          <Link href={`/players/${p2Name}`} className="font-bold text-sm text-white hover:text-cyan-400 truncate max-w-full">
            {p2Name}
          </Link>
          <span className="block max-w-full truncate text-[10px] text-slate-400">{match.player2?.profile?.efootballIgn}</span>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="flex flex-col gap-2 border-t border-slate-800 pt-2 text-xs min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
        <span className="break-words text-[10px] font-medium text-slate-400">Status: <strong className="text-slate-200">{match.status.replaceAll("_", " ")}</strong></span>

        {isPlayerInMatch && match.status !== "CONFIRMED" && (
          <div className="flex min-w-0 gap-2 self-stretch min-[390px]:self-auto">
            <button
              onClick={() => setShowModal(true)}
              className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30"
            >
              <Send className="w-3 h-3" /> Submit Result
            </button>
            <button
              onClick={() => setShowDisputeModal(true)}
              aria-label="Report match dispute"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              title="Report Dispute"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Result Submission Modal */}
      {showModal && (
        <div className="dialog-backdrop">
          <div className="dialog-panel max-w-md overflow-y-auto p-4 sm:p-6">
            <h4 className="font-extrabold text-white text-base">Submit Match Result</h4>
            {msg && <p className="text-xs font-semibold">{msg}</p>}
            <form onSubmit={handleSubmitResult} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-300">Your Score ({isP1 ? p1Name : p2Name})</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    required
                    value={playerScore}
                    onChange={(e) => setPlayerScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Opponent Score</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    required
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white text-center"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-300">Match Result Screenshot</label>
                <label className="mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-500/40 bg-slate-950 px-3 py-3 text-center hover:border-cyan-400">
                  {screenshotPreview ? <Image src={screenshotPreview} alt="Match screenshot preview" width={448} height={224} unoptimized className="max-h-28 w-auto rounded-lg object-contain" /> : <><ImageIcon className="h-6 w-6 text-cyan-400" /><span className="text-xs text-slate-300">Choose screenshot image</span><span className="text-[10px] text-slate-500">JPG, PNG or WEBP up to 5MB</span></>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handleScreenshotChange(e.target.files?.[0])} />
                </label>
              </div>
              <div>
                <label className="text-xs text-slate-300">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Clean match, gg"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 min-[390px]:flex-row">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold"
                >
                  {uploading ? <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Uploading...</> : submitting ? "Submitting..." : "Confirm Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="dialog-backdrop">
          <div className="dialog-panel max-w-md overflow-y-auto p-4 sm:p-6">
            <h4 className="font-extrabold text-rose-400 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Report Match Dispute
            </h4>
            {msg && <p className="text-xs font-semibold">{msg}</p>}
            <form onSubmit={handleSubmitDispute} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300">Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="">Select Reason</option>
                  <option value="Wrong result submitted">Wrong result submitted</option>
                  <option value="Fake screenshot">Fake screenshot</option>
                  <option value="Opponent did not show up">Opponent did not show up</option>
                  <option value="Disconnection / Cheating">Disconnection / Cheating</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="Explain clearly what happened..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                ></textarea>
              </div>
              <div><label className="text-xs text-slate-300">Evidence image (optional)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDisputeEvidence(event.target.files?.[0] || null)} className="mt-1 block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-cyan-300" /></div>
              <div className="flex flex-col-reverse gap-2 pt-2 min-[390px]:flex-row">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold"
                >
                  {submitting ? "Filing..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
