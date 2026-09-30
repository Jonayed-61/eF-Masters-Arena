import Link from "next/link";
import { ArrowRight, CalendarClock, Swords, Trophy } from "lucide-react";
import { FixtureCard, FormBadges, StandingsTable, StatusBadge } from "@/components/ui";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getTournamentData } from "@/lib/data";
import { calculateGoalLeaderboard, calculateProvisionalStandings, getCurrentTableStatus, hasPendingResults } from "@/lib/tournament";

export default async function Home() {
  const { players, fixtures, season, isDemo } = await getTournamentData();
  const table = calculateProvisionalStandings(players, fixtures);
  const leaders = calculateGoalLeaderboard(players, fixtures).slice(0, 4);
  const recent = fixtures.filter((fixture) => fixture.homeScore !== null).sort((a, b) => b.matchweek - a.matchweek).slice(0, 3);
  const upcoming = fixtures.filter((fixture) => fixture.status === "upcoming").slice(0, 3);
  const status = getCurrentTableStatus(fixtures);
  const pending = fixtures.filter((fixture) => fixture.approvalStatus === "pending").length;

  return <main className="page"><RealtimeRefresh seasonId={season.id} /><div className="shell stack">
    {isDemo && <div className="card" style={{ padding: "11px 15px", borderColor: "rgba(36,212,232,.25)", color: "#b9f7ff", fontSize: 12 }}><strong>Demo season:</strong> connect Supabase with the included migration to use secure accounts and live data.</div>}
    <section className="card hero">
      <div>
        <div className="eyebrow">Season 2026 · Matchweek {season.currentMatchweek}</div>
        <h1>Play bold.<br /><span style={{ color: "var(--gold)" }}>Rule the table.</span></h1>
        <p>The official home of {season.name}. Every match, every goal, every rivalry — verified and live.</p>
        <div className="hero-actions" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}><Link href="/fixtures" className="btn btn-primary">View fixtures <ArrowRight size={17} /></Link><Link href="/head-to-head" className="btn"><Swords size={17} /> Compare players</Link></div>
      </div>
    </section>

    <section className="card card-pad" style={{ borderColor: status === "OFFICIAL" ? "rgba(56,217,150,.24)" : "rgba(255,157,69,.28)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div><div className="eyebrow">Current table status</div><h2 style={{ margin: "7px 0 5px", fontSize: 23 }}>Live table — {status}</h2><p className="muted" style={{ margin: 0, fontSize: 13 }}>{hasPendingResults(fixtures) ? "Includes submitted results awaiting administrator approval." : "All included results have been verified by tournament administration."}</p></div>
        <div style={{ textAlign: "right" }}><StatusBadge status={status} /><div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Pending approvals: {pending}</div></div>
      </div>
    </section>

    <div className="grid-main">
      <section className="card card-pad">
        <div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">League standings</div><h2>Race for the title</h2></div><Link href="/standings" className="btn">Full table <ArrowRight size={15} /></Link></div>
        <StandingsTable rows={table.slice(0, 6)} compact />
      </section>
      <section className="card card-pad">
        <div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Top scorers</div><h2>Goal leaders</h2></div><Trophy size={24} color="var(--gold)" /></div>
        <div className="stack" style={{ gap: 8 }}>{leaders.map((row) => <Link href={`/players/${row.playerId}`} key={row.playerId} style={{ display: "flex", alignItems: "center", gap: 12, padding: 11, background: "rgba(255,255,255,.025)", borderRadius: 12 }}><strong style={{ color: "var(--gold)", width: 18 }}>{row.rank}</strong><span style={{ flex: 1 }}><strong style={{ display: "block", fontSize: 13 }}>{row.playerName}</strong><small className="muted">{row.teamName} · {row.played} matches</small></span><strong style={{ fontSize: 20 }}>{row.goalsFor}</strong></Link>)}</div>
      </section>
    </div>

    <div className="grid-main">
      <section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Latest</div><h2>Recent results</h2></div></div>{recent.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} players={players} />)}</section>
      <section className="card card-pad"><div className="section-title" style={{ marginTop: 0 }}><div><div className="eyebrow">Next up</div><h2>Upcoming</h2></div><CalendarClock size={24} color="var(--cyan)" /></div>{upcoming.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} players={players} />)}</section>
    </div>

    <section className="grid-3">
      {table.slice(0, 3).map((row) => <Link href={`/players/${row.playerId}`} className="card card-pad" key={row.playerId}><div className="eyebrow">#{row.position} · {row.teamName}</div><h3 style={{ margin: "10px 0 14px", fontSize: 21 }}>{row.playerName}</h3><FormBadges form={row.form} /><div className="muted" style={{ marginTop: 12, fontSize: 12 }}>{row.points} points · {row.goalsFor} goals</div></Link>)}
    </section>
  </div></main>;
}
