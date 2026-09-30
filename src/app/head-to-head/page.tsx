import { requireViewer } from "@/lib/auth";
import { AppShell } from "@/components/navigation";
import { EmptyState, MetricCard, PageHeader, SectionHeader } from "@/components/ui";
import { getActiveTournament, getTournamentPageData } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/constants";

export default async function HeadToHeadPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const viewer = await requireViewer();
  const query = await searchParams;
  const tournament = await getActiveTournament();
  const data = tournament ? await getTournamentPageData(tournament.id) : null;
  const validA = data?.players.some((player) => player.id === query.a) ? query.a : undefined;
  const validB = data?.players.some((player) => player.id === query.b) ? query.b : undefined;
  let h2h: Record<string, unknown> | null = null;
  if (tournament && validA && validB && validA !== validB) {
    const supabase = await createServerSupabaseClient();
    const { data: result } = await supabase.rpc("head_to_head", { p_tournament_id: tournament.id, p_player_a: validA, p_player_b: validB });
    h2h = result as Record<string, unknown> | null;
  }
  const playerA = data?.players.find((player) => player.id === validA);
  const playerB = data?.players.find((player) => player.id === validB);
  const history = Array.isArray(h2h?.history) ? h2h.history as Array<Record<string, unknown>> : [];
  return <AppShell viewer={viewer}><PageHeader eyebrow="Approved history" title="Head to head" description="Match outcomes use table scores; scorer totals use actual goals only." /><form className="panel form-grid" method="get"><label className="field"><span>Player A</span><select name="a" defaultValue={validA ?? ""} required><option value="" disabled>Select player</option>{data?.players.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select></label><label className="field"><span>Player B</span><select name="b" defaultValue={validB ?? ""} required><option value="" disabled>Select player</option>{data?.players.map((player) => <option key={player.id} value={player.id}>{player.username}</option>)}</select></label><div className="form-footer"><button className="button button-primary" type="submit">Compare players</button></div></form>{h2h && playerA && playerB ? <><SectionHeader title={`${playerA.username} vs ${playerB.username}`} /><div className="metrics-grid"><MetricCard label="Matches" value={String(h2h.matches_played ?? 0)} /><MetricCard label={`${playerA.username} wins`} value={String(h2h.player_a_wins ?? 0)} /><MetricCard label={`${playerB.username} wins`} value={String(h2h.player_b_wins ?? 0)} /><MetricCard label="Draws" value={String(h2h.draws ?? 0)} /><MetricCard label={`${playerA.username} actual goals`} value={String(h2h.player_a_actual_goals ?? 0)} accent /><MetricCard label={`${playerB.username} actual goals`} value={String(h2h.player_b_actual_goals ?? 0)} /></div><SectionHeader title="Match history" />{history.length ? <section className="panel result-list">{history.map((match) => <article className="result-card" key={String(match.id)}><strong>{String(match.home_table_score)}–{String(match.away_table_score)}</strong><p>Actual: {String(match.home_actual_goals)}–{String(match.away_actual_goals)} · {formatDate(String(match.match_date))}</p></article>)}</section> : <EmptyState title="No meetings" description="These players have no approved match history." />}</> : <EmptyState title="Choose two players" description="Select any two active tournament players to calculate their approved head-to-head record." />}</AppShell>;
}
