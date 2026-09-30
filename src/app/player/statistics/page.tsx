import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { getActiveTournament, getPlayerStatisticsData } from "@/lib/queries";
import { EmptyState, MetricCard, PageHeader, SectionHeader } from "@/components/ui";

export default async function PlayerStatisticsPage() {
  const viewer = await requireViewer("PLAYER");
  const tournament = await getActiveTournament();
  const data = tournament ? await getPlayerStatisticsData(tournament.id, viewer.userId) : null;
  const stats = data?.stats;
  const n = (key: string) => Number(stats?.[key] ?? 0);
  const form = Array.isArray(stats?.current_form) ? stats.current_form as string[] : [];
  return <><PageHeader eyebrow="Verified numbers" title="My statistics" description="Outcomes use table scores. Scorer statistics use actual goals only." actions={<Link className="button button-secondary" href={`/head-to-head?a=${viewer.userId}`}>Compare head to head</Link>} />{stats ? <><div className="metrics-grid metrics-wide"><MetricCard label="Matches" value={n("matches")} /><MetricCard label="Wins" value={n("wins")} /><MetricCard label="Draws" value={n("draws")} /><MetricCard label="Losses" value={n("losses")} /><MetricCard label="Actual goals" value={n("actual_goals_scored")} accent /><MetricCard label="Conceded" value={n("goals_conceded")} /><MetricCard label="Goal difference" value={n("goal_difference")} /><MetricCard label="Goal ratio" value={stats.goal_ratio == null ? "∞" : n("goal_ratio").toFixed(2)} /><MetricCard label="Win rate" value={`${n("win_percentage").toFixed(1)}%`} /><MetricCard label="Form" value={<div className="form-strip">{form.length ? form.map((value, index) => <span className={`form-dot form-${value}`} key={`${value}-${index}`}>{value}</span>) : "—"}</div>} /></div><SectionHeader title="Opponent by opponent" description="Walkover and administrative bonus goals are excluded from actual scorer totals." /><section className="panel table-scroll">{data?.opponents.length ? <table className="standings"><thead><tr><th>Opponent</th><th>Matches</th><th>Actual Goals</th><th>Conceded</th><th>W</th><th>D</th><th>L</th></tr></thead><tbody>{data.opponents.map((row) => <tr key={String(row.opponent_id)}><td><strong>{String(row.opponent_username)}</strong></td><td>{String(row.matches)}</td><td>{String(row.actual_goals_scored)}</td><td>{String(row.goals_conceded)}</td><td>{String(row.wins)}</td><td>{String(row.draws)}</td><td>{String(row.losses)}</td></tr>)}</tbody></table> : <EmptyState title="No opponent history" description="Approved head-to-head records will be calculated here." />}</section></> : <EmptyState title="No statistics yet" description="Statistics are derived from approved result records and remain empty until matches are completed." />}</>;
}
