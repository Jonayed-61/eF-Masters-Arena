import { notFound } from "next/navigation";
import { FixtureCard, FormBadges, Metric, StatusBadge } from "@/components/ui";
import { getTournamentData } from "@/lib/data";
import { calculateGoalsByOpponent, calculatePlayerStats, getCurrentTableStatus } from "@/lib/tournament";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { players, fixtures } = await getTournamentData();
  const player = players.find((item) => item.id === id);
  if (!player) notFound();
  const stats = calculatePlayerStats(id, players, fixtures);
  if (!stats) notFound();
  const breakdown = calculateGoalsByOpponent(id, players, fixtures);
  const recent = fixtures.filter((fixture) => fixture.homeScore !== null && [fixture.homeUserId, fixture.awayUserId].includes(id)).sort((a, b) => b.matchweek - a.matchweek).slice(0, 5);
  const upcoming = fixtures.filter((fixture) => fixture.status === "upcoming" && [fixture.homeUserId, fixture.awayUserId].includes(id)).slice(0, 3);
  return <main className="page"><div className="shell stack">
    <section className="card card-pad" style={{ minHeight: 240, display: "flex", alignItems: "end", background: "radial-gradient(circle at 85% 20%, rgba(245,200,76,.17), transparent 30%), var(--panel)" }}><div><div className="club-mark" style={{ width: 72, height: 72, fontSize: 22 }}>{player.teamName.slice(0,2).toUpperCase()}</div><div className="eyebrow" style={{ marginTop: 18 }}>@{player.username} · {player.gamePlayerId}</div><h1 style={{ margin: "7px 0", fontSize: "clamp(36px,8vw,62px)", letterSpacing: "-.055em" }}>{player.name}</h1><span className="muted">{player.teamName}</span></div><div style={{ marginLeft: "auto", alignSelf: "start" }}><StatusBadge status={getCurrentTableStatus(fixtures)} /></div></section>
    <section className="grid-4"><Metric label="League position" value={`#${stats.position}`} accent="var(--gold)" /><Metric label="Points" value={stats.points} /><Metric label="Played" value={stats.played} /><Metric label="Goals" value={stats.goalsFor} accent="var(--cyan)" /></section>
    <section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">League record</div><h2>Performance</h2></div><FormBadges form={stats.form} /></div><div className="grid-4"><div><span className="muted">Win rate</span><h3>{stats.winPercentage.toFixed(0)}%</h3></div><div><span className="muted">Goals / match</span><h3>{stats.goalsPerMatch.toFixed(2)}</h3></div><div><span className="muted">Home</span><h3>{stats.homeRecord.wins}W {stats.homeRecord.draws}D {stats.homeRecord.losses}L</h3></div><div><span className="muted">Away</span><h3>{stats.awayRecord.wins}W {stats.awayRecord.draws}D {stats.awayRecord.losses}L</h3></div></div></section>
    <div className="grid-main"><section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Scouting report</div><h2>Goals by opponent</h2></div></div><div className="table-wrap"><table><thead><tr><th>Opponent</th><th>P</th><th>GF</th><th>GA</th><th>GD</th><th>W-D-L</th></tr></thead><tbody>{breakdown.map((row) => <tr key={row.opponentId}><td><strong>{row.opponentName}</strong></td><td>{row.matchesPlayed}</td><td>{row.goalsScored}</td><td>{row.goalsConceded}</td><td>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</td><td>{row.wins}-{row.draws}-{row.losses}</td></tr>)}</tbody></table></div></section><section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Coming up</div><h2>Next matches</h2></div></div>{upcoming.length ? upcoming.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} players={players} />) : <p className="muted">No fixtures scheduled.</p>}</section></div>
    <section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Latest form</div><h2>Recent matches</h2></div></div>{recent.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} players={players} />)}</section>
  </div></main>;
}
