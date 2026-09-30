import { redirect } from "next/navigation";
import { getActiveTournament } from "@/lib/queries";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminTournamentShortcut() {
  const tournament = await getActiveTournament();
  if (tournament) redirect(`/admin/tournaments/${tournament.id}`);
  return <><PageHeader title="Tournament" /><EmptyState title="No active tournament" description="Activate a tournament in Supabase before opening tournament control." /></>;
}

