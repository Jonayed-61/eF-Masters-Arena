"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Fixture, Player } from "@/lib/types";
import { calculateHeadToHead } from "@/lib/tournament";
import { ClubMark, StatusBadge } from "./ui";

export function H2HComparator({ players, fixtures }: { players: Player[]; fixtures: Fixture[] }) {
  const [playerA, setPlayerA] = useState(players[0]?.id ?? "");
  const [playerB, setPlayerB] = useState(players[1]?.id ?? "");
  const result = useMemo(() => calculateHeadToHead(playerA, playerB, players, fixtures), [playerA, playerB, players, fixtures]);
  return <div className="stack">
    <section className="card card-pad"><div className="grid-3" style={{ alignItems: "end" }}>
      <label><span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Player A</span><select className="field" value={playerA} onChange={(event) => setPlayerA(event.target.value)}>{players.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label>
      <div style={{ textAlign: "center", fontWeight: 950, color: "var(--gold)", paddingBottom: 12 }}>VS</div>
      <label><span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Player B</span><select className="field" value={playerB} onChange={(event) => setPlayerB(event.target.value)}>{players.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label>
    </div></section>
    {!result ? <div className="card card-pad">Choose two different players to compare.</div> : <>
      <section className="card card-pad">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, textAlign: "center" }}>
          <Link href={`/players/${result.playerA.id}`}><ClubMark player={result.playerA} size={64} /><h2>{result.playerA.name}</h2><span className="muted">{result.playerA.teamName}</span></Link>
          <div><span className="eyebrow">All meetings</span><div style={{ fontSize: 34, fontWeight: 950, margin: "6px 0" }}>{result.playerAGoals} — {result.playerBGoals}</div><span className="muted">{result.matchesPlayed} played</span></div>
          <Link href={`/players/${result.playerB.id}`}><ClubMark player={result.playerB} size={64} /><h2>{result.playerB.name}</h2><span className="muted">{result.playerB.teamName}</span></Link>
        </div>
      </section>
      <section className="grid-4">
        <div className="card stat-card"><div className="label">{result.playerA.name} wins</div><div className="value" style={{ color: "var(--green)" }}>{result.playerAWins}</div></div>
        <div className="card stat-card"><div className="label">Draws</div><div className="value">{result.draws}</div></div>
        <div className="card stat-card"><div className="label">{result.playerB.name} wins</div><div className="value" style={{ color: "var(--cyan)" }}>{result.playerBWins}</div></div>
        <div className="card stat-card"><div className="label">Average goals</div><div className="value">{result.averageGoals.toFixed(1)}</div></div>
      </section>
      <section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Record</div><h2>Match history</h2></div></div>
        {result.matchHistory.length ? result.matchHistory.map((fixture) => <div key={fixture.id} style={{ display: "grid", gridTemplateColumns: "70px 1fr auto", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--line)" }}><span className="muted">MW {fixture.matchweek}</span><strong>{players.find((p) => p.id === fixture.homeUserId)?.name} {fixture.homeScore} — {fixture.awayScore} {players.find((p) => p.id === fixture.awayUserId)?.name}</strong><StatusBadge status={fixture.approvalStatus === "pending" ? "UNOFFICIAL" : "OFFICIAL"} /></div>) : <p className="muted">No completed meetings yet.</p>}
      </section>
    </>}
  </div>;
}
