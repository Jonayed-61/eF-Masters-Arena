import { requireViewer } from "@/lib/auth";
import { getActiveTournament, getTournamentPageData } from "@/lib/queries";
import { FixtureList } from "@/components/fixture-list";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function PlayerMatchesPage() {
  const viewer = await requireViewer("PLAYER");
  const tournament = await getActiveTournament();
  const data = tournament ? await getTournamentPageData(tournament.id) : null;
  return <><PageHeader eyebrow="Match center" title="Fixtures" description="All fixtures are created manually. Dates only—there are no match-time fields." />{data ? <FixtureList fixtures={data.fixtures} playerId={viewer.userId} /> : <EmptyState title="No active fixtures" description="An Admin has not activated a tournament yet." />}</>;
}

