import Link from "next/link";
import { getActiveTournament, getAdminDashboard, getTournamentPageData } from "@/lib/queries";
import { FixtureForm, FixtureResolutionForm } from "@/components/forms";
import { FixtureList } from "@/components/fixture-list";
import { EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/constants";

export default async function AdminFixturesPage() {
  const tournament = await getActiveTournament();
  const [data, dashboard] = tournament ? await Promise.all([getTournamentPageData(tournament.id), getAdminDashboard()]) : [null, null];
  return <><PageHeader eyebrow="Manual scheduling" title="Fixtures" description="Create and manage date-only fixtures manually." />{data && tournament ? <><section className="panel"><h2>Create Fixture</h2><FixtureForm tournament={tournament} players={data.players} /></section><SectionHeader title="Overdue fixtures" description="Enter a result from the match page, or reschedule/postpone here." />{dashboard?.overdue.length ? <section className="panel result-list">{dashboard.overdue.map((row) => <article className="result-card" key={String(row.id)}><strong>{String(row.home_username)} vs {String(row.away_username)}</strong><p>{formatDate(String(row.match_date))} · Round {String(row.matchweek)}</p><div className="inline-form"><Link className="button button-primary" href={`/matches/${String(row.id)}`}>Enter result</Link></div><FixtureResolutionForm fixtureId={String(row.id)} /></article>)}</section> : <EmptyState title="No overdue fixtures" description="Reserve Day fixtures use their current reserve date and are not judged by an old date." />}<SectionHeader title="All fixtures" /><FixtureList fixtures={data.fixtures} adminControls reserveDays={data.reserveDays} /></> : <EmptyState title="No active tournament" description="An active tournament is required before fixtures can be created." />}</>;
}
