import Link from "next/link";
import type { Fixture, Player, Standing } from "@/lib/types";

export function ClubMark({ player, size = 38 }: { player: Player; size?: number }) {
  const initials = player.teamName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <span className="club-mark" style={{ width: size, height: size, fontSize: size * .29 }}>{initials}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const clean = status.toLowerCase();
  const cls = clean.includes("official") && !clean.includes("unofficial") ? "official" : clean.includes("disput") ? "disputed" : clean.includes("upcoming") ? "upcoming" : "unofficial";
  return <span className={`pill ${cls}`}>{status.replaceAll("_", " ")}</span>;
}

export function FormBadges({ form }: { form: ("W" | "D" | "L")[] }) {
  return <span className="form">{form.length ? form.map((result, index) => <span className={result} key={`${result}-${index}`}>{result}</span>) : <span className="muted">—</span>}</span>;
}

export function StandingsTable({ rows, compact = false }: { rows: Standing[]; compact?: boolean }) {
  return <div className="table-wrap"><table>
    <thead><tr><th>Pos</th><th>Player</th>{!compact && <><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th></>}<th>Pts</th>{!compact && <th>Form</th>}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.playerId}>
      <td style={{ fontWeight: 900, color: row.position <= 3 ? "var(--gold)" : undefined }}>{row.position}</td>
      <td><Link className="player-cell" href={`/players/${row.playerId}`}><span className="club-mark">{row.teamName.slice(0, 2).toUpperCase()}</span><span><strong>{row.playerName}</strong><span>{row.teamName}</span></span></Link></td>
      {!compact && <><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td style={{ color: row.goalDifference > 0 ? "var(--green)" : row.goalDifference < 0 ? "var(--red)" : undefined }}>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</td></>}
      <td style={{ fontWeight: 950, fontSize: 15 }}>{row.points}</td>{!compact && <td><FormBadges form={row.form} /></td>}
    </tr>)}</tbody>
  </table></div>;
}

export function FixtureCard({ fixture, players }: { fixture: Fixture; players: Player[] }) {
  const home = players.find((player) => player.id === fixture.homeUserId)!;
  const away = players.find((player) => player.id === fixture.awayUserId)!;
  const played = fixture.homeScore !== null && fixture.awayScore !== null;
  return <div className="fixture">
    <div className="team"><span>{home?.name}</span><ClubMark player={home} /></div>
    <div className="meta"><div className="score">{played ? `${fixture.homeScore} — ${fixture.awayScore}` : "VS"}</div><small>{fixture.matchDate ? new Date(`${fixture.matchDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "TBD"} · {fixture.matchTime?.slice(0, 5) ?? "TBD"}</small></div>
    <div className="team"><ClubMark player={away} /><span>{away?.name}</span></div>
  </div>;
}

export function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return <div className="card stat-card"><div className="label">{label}</div><div className="value" style={{ color: accent }}>{value}</div></div>;
}
