import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAdminDashboard } from "@/lib/queries";
import { EmptyState, MetricCard, PageHeader, SectionHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/constants";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard();
  if (!data.tournament || !data.metrics) return <><PageHeader eyebrow="Operations" title="Admin dashboard" description="Tournament control begins when a tournament is activated." /><EmptyState title="No active tournament" description="Apply the clean schema and provision the current tournament before managing operations." /></>;
  const value = (key: string) => data.metrics?.[key] ?? 0;
  return <>
    <PageHeader eyebrow="Tournament operations" title="Admin dashboard" description={`${data.tournament.name} · Matchweek ${data.tournament.current_matchweek || "—"}`} actions={<Link className="button button-primary" href={`/admin/tournaments/${data.tournament.id}`}>Manage tournament <ArrowRight /></Link>} />
    <div className="metrics-grid metrics-wide">
      <MetricCard label="Status" value="ONGOING" />
      <MetricCard label="Fixture mode" value="MANUAL" />
      <MetricCard label="Total players" value={value("total_players")} />
      <MetricCard label="Total fixtures" value={value("total_fixtures")} />
      <MetricCard label="Results" value={data.results} />
      <MetricCard label="Completed" value={value("matches_completed")} />
      <MetricCard label="Remaining" value={value("remaining_matches")} />
      <MetricCard label="Pending results" value={value("pending_results")} accent />
      <MetricCard label="Disputed" value={value("disputed_results")} />
      <MetricCard label="Matchweek" value={value("current_matchweek")} />
      <MetricCard label="Draft table" value={Number(value("pending_results")) ? "UNOFFICIAL" : "CURRENT"} />
      <MetricCard label="Official table" value="APPROVED ONLY" />
      <MetricCard label="Reserve requests" value={value("reserve_requests")} />
    </div>
    <SectionHeader title="Overdue Fixtures" description="Past-date fixtures without a valid result. Future Reserve Day dates are respected." />
    {data.overdue.length ? <section className="panel result-list">{data.overdue.map((row) => <article className="result-card" key={String(row.id)}><header><strong>{String(row.home_username)} vs {String(row.away_username)}</strong><StatusBadge status="SCHEDULED" /></header><p>{formatDate(String(row.match_date))} · Matchweek {String(row.matchweek)}</p><Link className="button button-danger" href={`/matches/${String(row.id)}`}>Resolve match <ArrowRight /></Link></article>)}</section> : <EmptyState title="No overdue fixtures" description="No fixture currently meets the overdue rule." />}
    <SectionHeader title="Pending Result Submissions" />
    {data.pending.length ? <section className="panel result-list">{data.pending.map((result) => <article className="result-card" key={result.id}><strong>{result.fixture.home_player?.username} {result.home_table_score}–{result.away_table_score} {result.fixture.away_player?.username}</strong><p>{result.result_type} · awaiting review</p><Link className="button button-secondary" href="/admin/results">Review result</Link></article>)}</section> : <EmptyState title="No pending submissions" description="Submitted results will appear here immediately." />}
  </>;
}

