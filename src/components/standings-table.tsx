"use client";

import { useState } from "react";
import type { StandingRow } from "@/lib/types";
import { Badge, EmptyState } from "@/components/ui";

function Table({ rows }: { rows: StandingRow[] }) {
  if (!rows.length) return <EmptyState icon="trophy" title="No standings yet" description="The table will populate from valid result records. No totals are stored or faked." />;
  return <div className="table-scroll"><table className="standings"><thead><tr><th>POS</th><th>PLAYER</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead><tbody>{rows.map((row) => <tr key={row.player_id}><td><b>{row.position}</b></td><td><strong>{row.username}</strong>{row.team_name && <small>{row.team_name}</small>}</td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.goals_for}</td><td>{row.goals_against}</td><td>{row.goal_difference > 0 ? "+" : ""}{row.goal_difference}</td><td><b>{row.points}</b>{row.penalty_adjustment !== 0 && <small className="penalty-note">{row.penalty_adjustment > 0 ? "+" : ""}{row.penalty_adjustment} adj.</small>}</td></tr>)}</tbody></table></div>;
}

export function StandingsSwitcher({ unofficial, official, pendingCount }: { unofficial: StandingRow[]; official: StandingRow[]; pendingCount: number }) {
  const [mode, setMode] = useState<"unofficial" | "official">("unofficial");
  return <section className="panel"><div className="segmented"><button className={mode === "unofficial" ? "active" : ""} onClick={() => setMode("unofficial")}>Unofficial</button><button className={mode === "official" ? "active" : ""} onClick={() => setMode("official")}>Official</button></div><div className="table-explainer"><div><Badge tone={mode === "unofficial" ? "warning" : "success"}>{mode === "unofficial" ? "DRAFT TABLE" : "FINAL TABLE"}</Badge></div><p>{mode === "unofficial" ? "Includes submitted results awaiting Admin approval, plus approved results." : "Includes Admin-approved results only."}</p>{mode === "unofficial" && pendingCount > 0 && <span>{pendingCount} unresolved submission{pendingCount === 1 ? "" : "s"}</span>}</div><Table rows={mode === "unofficial" ? unofficial : official} /></section>;
}

export function StaticStandingsTable({ rows, mode }: { rows: StandingRow[]; mode: "unofficial" | "official" }) {
  return <section className="panel"><div className="table-explainer"><Badge tone={mode === "unofficial" ? "warning" : "success"}>{mode === "unofficial" ? "UNOFFICIAL" : "OFFICIAL"}</Badge><p>{mode === "unofficial" ? "Approved and unresolved valid submissions." : "Admin-approved results only."}</p></div><Table rows={rows} /></section>;
}

