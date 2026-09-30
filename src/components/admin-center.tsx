"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fixture, Player } from "@/lib/types";
import { StatusBadge } from "./ui";

export function AdminCenter({ fixtures, players, disabled = false }: { fixtures: Fixture[]; players: Player[]; disabled?: boolean }) {
  const router = useRouter();
  const pending = fixtures.filter((fixture) => fixture.approvalStatus === "pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const name = (id: string) => players.find((player) => player.id === id)?.name ?? "Unknown";
  async function review(id: string, action: "approve" | "reject" | "correct", current?: Fixture) {
    const reason = action !== "approve" ? window.prompt(action === "reject" ? "Reason for rejection:" : "Reason for correction:") : undefined;
    if (action !== "approve" && !reason) return;
    const homeScore = action === "correct" ? window.prompt("Correct home score:", String(current?.homeScore ?? 0)) : undefined;
    if (action === "correct" && homeScore === null) return;
    const awayScore = action === "correct" ? window.prompt("Correct away score:", String(current?.awayScore ?? 0)) : undefined;
    if (action === "correct" && awayScore === null) return;
    setBusy(true);
    const response = await fetch(`/api/admin/results/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason, homeScore, awayScore }) });
    const payload = await response.json(); setMessage(response.ok ? `Result ${action}d.` : payload.error); setBusy(false); if (response.ok) router.refresh();
  }
  async function bulkApprove() {
    if (!selected.length || !window.confirm(`Approve ${selected.length} submitted result${selected.length === 1 ? "" : "s"}?`)) return;
    setBusy(true); const response = await fetch("/api/admin/results/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixtureIds: selected }) });
    const payload = await response.json(); setMessage(response.ok ? `${selected.length} results approved.` : payload.error); setBusy(false); if (response.ok) { setSelected([]); router.refresh(); }
  }
  return <section className="card card-pad">
    <div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Review queue</div><h2>Result approval center</h2><p>{pending.length} result{pending.length === 1 ? "" : "s"} awaiting final authority.</p></div><button className="btn btn-primary" onClick={bulkApprove} disabled={!selected.length || busy || disabled}>Approve selected ({selected.length})</button></div>
    {message && <p style={{ color: message.includes("approved") ? "var(--green)" : "var(--amber)" }}>{message}</p>}
    {!pending.length ? <p className="muted">The queue is clear. The current table is official.</p> : pending.map((fixture) => <div className="approval-row" key={fixture.id}>
      <input type="checkbox" aria-label={`Select ${name(fixture.homeUserId)} vs ${name(fixture.awayUserId)}`} checked={selected.includes(fixture.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, fixture.id] : selected.filter((id) => id !== fixture.id))} />
      <div><div className="eyebrow">Matchweek {fixture.matchweek} · submitted by {name(fixture.submittedBy ?? "")}</div><h3 style={{ margin: "6px 0" }}>{name(fixture.homeUserId)} <span className="score">{fixture.homeScore} — {fixture.awayScore}</span> {name(fixture.awayUserId)}</h3><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><StatusBadge status={fixture.opponentConfirmation ?? "pending"} /><span className="muted" style={{ fontSize: 11 }}>{fixture.submittedAt ? new Date(fixture.submittedAt).toLocaleString() : ""}</span></div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "end" }}>{fixture.resultScreenshot && <a className="btn" href={`/api/evidence/${fixture.id}`} target="_blank" rel="noreferrer">Evidence</a>}<button className="btn" onClick={() => review(fixture.id, "correct", fixture)} disabled={busy || disabled}>Edit & approve</button><button className="btn btn-primary" onClick={() => review(fixture.id, "approve")} disabled={busy || disabled}>Approve</button><button className="btn btn-danger" onClick={() => review(fixture.id, "reject")} disabled={busy || disabled}>Reject</button></div>
    </div>)}
  </section>;
}
