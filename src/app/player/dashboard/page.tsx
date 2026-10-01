import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, Trophy } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { formatDate } from "@/lib/constants";
import { getNotifications, getPlayerDashboard } from "@/lib/queries";
import { MatchCard } from "@/components/match-card";
import { EmptyState, MetricCard, PageHeader, SectionHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Player dashboard" };

export default async function PlayerDashboard() {
  const viewer = await requireViewer("PLAYER");
  const [data, notifications] = await Promise.all([getPlayerDashboard(viewer.userId), getNotifications(viewer.userId)]);
  const stats = data.stats;
  const number = (key: string) => Number(stats?.[key] ?? 0);
  return <>
    <PageHeader eyebrow="Player dashboard" title={`Welcome, ${viewer.profile.username}`} description="Your fixture, competition position, and verified performance." actions={<Link className="button button-secondary" href="/player/matches">All Matches <ArrowRight /></Link>} />
    <SectionHeader title="Today’s Match" description="The result window follows Bangladesh time and closes at midnight." />
    {data.todayFixtures.length ? <div className="today-match-grid">{data.todayFixtures.map((fixture) => <MatchCard fixture={fixture} viewerId={viewer.userId} featured key={fixture.id} />)}</div> : <EmptyState title="No match scheduled today" description="Your scheduled fixture will appear here on match day." icon="trophy" />}
    <SectionHeader title="Current Tournament" />
    {data.tournament ? <article className="panel tournament-summary"><div><span className="icon-chip"><Trophy /></span><div><StatusBadge status={data.tournament.status} /><h2>{data.tournament.name}</h2><p>Round {data.tournament.current_matchweek || "—"}</p></div></div><div className="tournament-summary-stats"><span><b>{data.standing?.position ?? "—"}</b> Position</span><span><b>{data.standing?.points ?? 0}</b> Points</span></div><Link className="button button-secondary" href={`/tournaments/${data.tournament.id}`}>Open Tournament <ArrowRight /></Link></article> : <EmptyState title="No active tournament" description="You are not currently in an active competition." />}
    <SectionHeader title="Performance Summary" description="Actual goals exclude administrative bonuses." />
    <div className="metrics-grid performance-grid"><MetricCard label="Played" value={number("matches")} /><MetricCard label="Wins" value={number("wins")} /><MetricCard label="Draws" value={number("draws")} /><MetricCard label="Losses" value={number("losses")} /><MetricCard label="Goals" value={number("actual_goals_scored")} accent /><MetricCard label="Win %" value={`${number("win_percentage").toFixed(0)}%`} /></div>
    <SectionHeader title="Recent Matches" description="Admin-approved results only." />
    {data.recentResults.length ? <div className="recent-match-grid">{data.recentResults.map((result) => { const fixture = result.fixture; const home = fixture.home_player_id === viewer.userId; const own = home ? result.home_table_score : result.away_table_score; const other = home ? result.away_table_score : result.home_table_score; const outcome = own > other ? "W" : own < other ? "L" : "D"; return <Link href={`/matches/${fixture.id}`} className="recent-match-card" key={result.id}><span className={`form-dot form-${outcome}`}>{outcome}</span><div><strong>{fixture.home_player?.username} {result.home_table_score}–{result.away_table_score} {fixture.away_player?.username}</strong><small>{formatDate(fixture.match_date)} · Official</small></div><ArrowRight /></Link>; })}</div> : <EmptyState title="No recent matches" description="Approved results will appear here." />}
    <SectionHeader title="Quick Actions" />
    <div className="quick-actions"><Link className="feature-card" href="/player/matches"><CalendarDays /><b>Browse Fixtures</b><span>Filter by Round, date, or status.</span></Link><Link className="feature-card" href="/player/statistics"><BarChart3 /><b>View Statistics</b><span>Review goals, form, and opponents.</span></Link></div>
    <SectionHeader title="Notifications" />
    <section className="panel">{notifications.length ? <div className="audit-list">{notifications.slice(0, 5).map((item) => <article className="audit-item" key={item.id}><strong>{item.title}</strong><p>{item.message}</p><small>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(item.created_at))}</small></article>)}</div> : <EmptyState title="No notifications" description="Result, fixture, Reserve Day, and penalty updates will appear here." />}</section>
  </>;
}
