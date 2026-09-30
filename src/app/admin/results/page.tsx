import { getAdminDashboard } from "@/lib/queries";
import { ReviewResultForm } from "@/components/forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { labelize } from "@/lib/constants";

export default async function AdminResultsPage() {
  const data = await getAdminDashboard();
  return <><PageHeader eyebrow="Approval queue" title="Results" description="Opponent confirmation is supporting information only. You can approve, edit through the match, or reject without it." />{data.pending.length ? <section className="panel result-list">{data.pending.map((result) => <article className="result-card" key={result.id}><header><strong>{result.fixture.home_player?.username} vs {result.fixture.away_player?.username}</strong><StatusBadge status={result.status} /></header><div className="scoreline"><span>{result.home_table_score}</span><small>—</small><span>{result.away_table_score}</span></div><p>{labelize(result.result_type)} · actual {result.home_actual_goals}–{result.away_actual_goals} · bonus {result.home_bonus_goals}–{result.away_bonus_goals}</p><ReviewResultForm submission={result} /></article>)}</section> : <EmptyState title="Approval queue is empty" description="Player submissions and Admin drafts awaiting review will appear here." />}</>;
}

