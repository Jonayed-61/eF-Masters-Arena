import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageOwnedTournament } from "@/lib/permissions";
import { TournamentWorkspaceClient } from "./TournamentWorkspaceClient";

export const revalidate = 0;
const profile = { fullName: true, username: true, efootballIgn: true } as const;

export default async function TournamentWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login");
  const { slug } = await params;
  const tournament = await db.tournament.findUnique({
    where: { slug },
    include: {
      registrations: { include: { user: { select: { email: true, profile: { select: profile } } }, payment: true }, orderBy: { createdAt: "desc" } },
      groups: { include: { members: { include: { participant: { include: { user: { select: { profile: { select: profile } } } } } } } }, orderBy: { order: "asc" } },
      matches: { include: { player1: { select: { profile: { select: profile } } }, player2: { select: { profile: { select: profile } } }, submissions: { orderBy: { createdAt: "desc" } } }, orderBy: [{ roundNumber: "asc" }, { matchNumber: "asc" }] },
      announcements: { orderBy: { createdAt: "desc" } },
      brackets: { select: { id: true } },
    },
  });
  if (!tournament) notFound();
  if (!canManageOwnedTournament(user, tournament.createdById)) redirect("/dashboard");
  const disputes = await db.dispute.findMany({ where: { match: { tournamentId: tournament.id } }, include: { reporter: { select: { profile: { select: profile } } }, reportedPlayer: { select: { profile: { select: profile } } }, match: { select: { roundName: true, matchNumber: true } } }, orderBy: { createdAt: "desc" } });
  return <TournamentWorkspaceClient tournament={{ ...tournament, disputes }} />;
}
