import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { getTournamentData } from "@/lib/data";
import { calculateGoalLeaderboard, getCurrentTableStatus } from "@/lib/tournament";

export const metadata = { title: "Player Statistics" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const params = await searchParams;
  const { players, fixtures } = await getTournamentData();
  const mode = params.view === "official" ? "official" : "live";
  const query = (params.q ?? "").toLowerCase();
  const rows = calculateGoalLeaderboard(players, fixtures, mode).filter((row) => `${row.playerName} ${row.teamName}`.toLowerCase().includes(query));
  return <main className="page"><div className="shell">
    <div className="section-title"><div><div className="eyebrow">Player analytics</div><h1>Goal leaderboard</h1><p>Goals, efficiency and defensive record from the source fixtures.</p></div><StatusBadge status={mode === "official" ? "OFFICIAL" : getCurrentTableStatus(fixtures)} /></div>
    <section className="card card-pad">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}><div className="tabs"><Link href="/stats" className={mode === "live" ? "active" : ""}>Live goals</Link><Link href="/stats?view=official" className={mode === "official" ? "active" : ""}>Official goals</Link></div><form><input className="field" style={{ minWidth: 230 }} name="q" placeholder="Search player or team" defaultValue={params.q} /><input type="hidden" name="view" value={mode} /></form></div>
      <div className="table-wrap"><table><thead><tr><th>Rank</th><th>Player</th><th>Matches</th><th>Goals</th><th>Goals / match</th><th>Conceded</th><th>GD</th></tr></thead><tbody>{rows.map((row) => <tr key={row.playerId}><td style={{ color: row.rank <= 3 ? "var(--gold)" : undefined, fontWeight: 950 }}>{row.rank}</td><td><Link href={`/players/${row.playerId}`}><strong>{row.playerName}</strong><small className="muted" style={{ display: "block" }}>{row.teamName}</small></Link></td><td>{row.played}</td><td style={{ fontWeight: 950, fontSize: 18 }}>{row.goalsFor}</td><td>{row.goalsPerMatch.toFixed(2)}</td><td>{row.goalsAgainst}</td><td>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</td></tr>)}</tbody></table></div>
    </section>
    <div className="grid-3" style={{ marginTop: 18 }}><Link className="card card-pad" href="/head-to-head"><div className="eyebrow">Compare</div><h2>Head to head</h2><p className="muted">Put any two players side by side.</p></Link><Link className="card card-pad" href="/standings"><div className="eyebrow">Competition</div><h2>League table</h2><p className="muted">Follow the title race live.</p></Link><Link className="card card-pad" href="/fixtures"><div className="eyebrow">Schedule</div><h2>All fixtures</h2><p className="muted">Browse every matchweek.</p></Link></div>
  </div></main>;
}
