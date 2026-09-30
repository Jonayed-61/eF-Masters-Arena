import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { formatDate } from "@/lib/constants";
import { getPlayerTournaments } from "@/lib/queries";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function PlayerTournamentsPage() {
  const viewer = await requireViewer("PLAYER");
  const tournaments = await getPlayerTournaments(viewer.userId);
  return <><PageHeader eyebrow="Competitions" title="My tournaments" description="Every competition you participate in, with the active season first." />{tournaments.length ? <div className="card-grid">{tournaments.map((tournament) => <article className="feature-card" key={tournament.id}><div className="tournament-card-top"><Trophy /><StatusBadge status={tournament.status} /></div><h2>{tournament.name}</h2><span><CalendarDays /> {formatDate(tournament.start_date)} · Matchweek {tournament.current_matchweek || "—"}</span><Link className="button button-secondary" href={`/tournaments/${tournament.id}`}>Open tournament <ArrowRight /></Link></article>)}</div> : <EmptyState icon="trophy" title="No tournaments yet" description="An Admin must add your account to a tournament before it appears here." />}</>;
}

