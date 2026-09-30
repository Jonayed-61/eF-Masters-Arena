import { redirect } from "next/navigation";
import { Bell, Goal, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getTournamentData } from "@/lib/data";
import { calculateGoalLeaderboard, calculatePlayerStats, getCurrentTableStatus } from "@/lib/tournament";
import { FixtureCard, FormBadges, Metric, StandingsTable, StatusBadge } from "@/components/ui";
import { ResultForm } from "@/components/result-form";
import { ResultResponse } from "@/components/result-response";

export const metadata = { title: "Player Dashboard" };

export default async function DashboardPage() {
  const [{ players, fixtures, isDemo }, auth] = await Promise.all([getTournamentData(), getCurrentUser()]);
  if (!isDemo && !auth.user) redirect("/login?next=/dashboard");
  const player = players.find((item) => item.id === auth.user?.id) ?? players[0];
  const stats = calculatePlayerStats(player.id, players, fixtures)!;
  const goalRank = calculateGoalLeaderboard(players, fixtures).find((row) => row.playerId === player.id)?.rank ?? "—";
  const upcoming = fixtures.filter((fixture) => fixture.status === "upcoming" && [fixture.homeUserId, fixture.awayUserId].includes(player.id));
  const confirmations = fixtures.filter((fixture) => fixture.approvalStatus === "pending" && fixture.submittedBy !== player.id && [fixture.homeUserId, fixture.awayUserId].includes(player.id) && fixture.opponentConfirmation === "pending");
  const recent = fixtures.filter((fixture) => fixture.homeScore !== null && [fixture.homeUserId, fixture.awayUserId].includes(player.id)).sort((a,b) => b.matchweek - a.matchweek).slice(0, 3);
  const status = getCurrentTableStatus(fixtures);
  return <main className="page"><div className="shell stack">
    <div className="section-title"><div><div className="eyebrow">Player command center</div><h1>Welcome, {player.name.split(" ")[0]}</h1><p>Your season at a glance.</p></div><div style={{ display: "flex", gap: 8 }}><StatusBadge status={status} /><button className="btn" aria-label="Notifications"><Bell size={17} /></button></div></div>
    <section className="grid-4"><Metric label={`League position · ${status.toLowerCase()}`} value={`#${stats.position}`} accent="var(--gold)" /><Metric label="Points" value={stats.points} /><Metric label="Goals" value={stats.goalsFor} accent="var(--cyan)" /><Metric label="Goal ranking" value={`#${goalRank}`} /></section>
    <div className="grid-main"><div className="stack">{confirmations.map((fixture) => <ResultResponse key={fixture.id} fixture={fixture} players={players} />)}{upcoming[0] && <section className="card card-pad"><div className="eyebrow">Next match</div><FixtureCard fixture={upcoming[0]} players={players} /></section>}{upcoming[0] && <ResultForm fixture={upcoming[0]} players={players} disabled={isDemo} />}</div><section className="card card-pad"><div className="eyebrow">Current form</div><h2 style={{ margin: "7px 0 18px" }}>Last five</h2><FormBadges form={stats.form} /><div style={{ marginTop: 24, display: "grid", gap: 14 }}><div style={{ display: "flex", gap: 10 }}><Trophy color="var(--gold)" /><span><strong>{stats.wins} wins</strong><small className="muted" style={{ display: "block" }}>{stats.winPercentage.toFixed(0)}% win rate</small></span></div><div style={{ display: "flex", gap: 10 }}><Goal color="var(--cyan)" /><span><strong>{stats.goalsPerMatch.toFixed(2)} goals / match</strong><small className="muted" style={{ display: "block" }}>{stats.goalsAgainst} conceded</small></span></div></div></section></div>
    <div className="grid-main"><section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">League snapshot</div><h2>Live table</h2></div></div><StandingsTable rows={calculateGoalLeaderboard(players, fixtures).sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference).slice(0,5)} compact /></section><section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Your history</div><h2>Recent results</h2></div></div>{recent.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} players={players} />)}</section></div>
  </div></main>;
}
