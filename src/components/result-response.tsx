"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fixture, Player } from "@/lib/types";

export function ResultResponse({ fixture, players }: { fixture: Fixture; players: Player[] }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const name = (id: string) => players.find((player) => player.id === id)?.name ?? "Unknown";
  async function respond(responseType: "confirmed" | "disputed") {
    const reason = responseType === "disputed" ? window.prompt("What is incorrect about this result?") : undefined;
    if (responseType === "disputed" && !reason) return;
    setBusy(true); const response = await fetch(`/api/results/${fixture.id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response: responseType, reason }) });
    const payload = await response.json(); setMessage(response.ok ? `Result ${responseType}. Admin will make the final decision.` : payload.error); setBusy(false); if (response.ok) router.refresh();
  }
  return <div className="card card-pad"><div className="eyebrow">Confirmation needed · MW {fixture.matchweek}</div><h3>{name(fixture.homeUserId)} <span className="score">{fixture.homeScore} — {fixture.awayScore}</span> {name(fixture.awayUserId)}</h3><p className="muted">Does this submitted score match your record?</p><div style={{ display: "flex", gap: 8 }}><button className="btn btn-primary" onClick={() => respond("confirmed")} disabled={busy}>Confirm score</button><button className="btn btn-danger" onClick={() => respond("disputed")} disabled={busy}>Dispute</button></div>{message && <p style={{ fontSize: 12 }}>{message}</p>}</div>;
}
