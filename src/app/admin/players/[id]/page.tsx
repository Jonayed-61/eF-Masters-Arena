import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureList } from "@/components/fixture-list";
import { Badge, EmptyState, MetricCard, PageHeader, SectionHeader, StatusBadge } from "@/components/ui";
import { getActiveTournament, getPlayerStatisticsData, getTournamentPageData } from "@/lib/queries";

export default async function AdminPlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getActiveTournament();
  if (!tournament) notFound();
  const [data, statistics] = await Promise.all([
    getTournamentPageData(tournament.id),
    getPlayerStatisticsData(tournament.id, id),
  ]);
  const player = data?.players.find((item) => item.id === id);
  if (!data || !player) notFound();
  const stats = statistics.stats;
  const n = (key: string) => Number(stats?.[key] ?? 0);
  const fixtures = data.fixtures.filter((fixture) => fixture.home_player_id === id || fixture.away_player_id === id);
  const results = data.results.filter((result) => result.fixture && [result.fixture.home_player_id, result.fixture.away_player_id].includes(id));

  return <><PageHeader eyebrow="Player operations" title={player.username} description={player.team_name || "No team name configured"} actions={<><Badge tone={player.status === "ACTIVE" ? "success" : "danger"}>{player.status === "ACTIVE" ? "Active" : "Inactive"}</Badge><Link className="button button-secondary" href={`/head-to-head?a=${id}`}>Compare H2H</Link></>} /><div className="metrics-grid"><MetricCard label="Matches" value={n("matches")} /><MetricCard label="Wins" value={n("wins")} /><MetricCard label="Draws" value={n("draws")} /><MetricCard label="Losses" value={n("losses")} /><MetricCard label="Actual goals" value={n("actual_goals_scored")} accent /><MetricCard label="Conceded" value={n("goals_conceded")} /><MetricCard label="Goal difference" value={n("goal_difference")} /><MetricCard label="Win rate" value={`${n("win_percentage").toFixed(1)}%`} /></div><SectionHeader title="Fixtures" /><FixtureList fixtures={fixtures} /><SectionHeader title="Results" />{results.length ? <section className="panel result-list">{results.map((result) => <article className="result-card" key={result.id}><header><strong>{result.fixture?.home_player?.username} {result.home_table_score}–{result.away_table_score} {result.fixture?.away_player?.username}</strong><StatusBadge status={result.status} /></header><p>Actual {result.home_actual_goals}–{result.away_actual_goals} · {result.result_type}</p><Link className="button button-secondary" href={`/matches/${result.fixture_id}`}>Open result</Link></article>)}</section> : <EmptyState title="No results" description="This player has no submitted or approved result records." />}</>;
}
