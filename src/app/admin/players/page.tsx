import Link from "next/link";
import { getActiveTournament, getTournamentPageData } from "@/lib/queries";
import { PlayerCreateForm, PlayerEditForm } from "@/components/forms";
import { EmptyState, PageHeader, SectionHeader } from "@/components/ui";

export default async function AdminPlayersPage() {
  const tournament = await getActiveTournament();
  const data = tournament ? await getTournamentPageData(tournament.id) : null;
  return <><PageHeader eyebrow="Access control" title="Players" description="Create login-only accounts from supplied credentials. No emails, passwords, team names, or photos are invented." actions={<Link className="button button-secondary" href="/head-to-head">Open H2H</Link>} /><section className="panel"><h2>Add Player</h2><PlayerCreateForm tournamentId={tournament?.id} /></section><SectionHeader title="Tournament players" description="Profile changes propagate immediately because competition records reference player IDs." />{data?.players.length ? <div className="result-list">{data.players.map((player) => <div key={player.id}><Link className="button button-secondary" href={`/admin/players/${player.id}`}>View {player.username} stats & matches</Link><PlayerEditForm player={player} /></div>)}</div> : <EmptyState title="No players provisioned" description="Use the secure form above or the command-line provisioning workflow." />}</>;
}

