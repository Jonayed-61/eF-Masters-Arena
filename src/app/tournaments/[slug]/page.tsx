import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { TournamentDetailClient } from "./TournamentDetailClient";
import { notFound } from "next/navigation";

const publicProfileFields = {
  fullName: true,
  username: true,
  profilePicture: true,
  efootballIgn: true,
  teamName: true,
  country: true,
  rankingPoints: true,
  globalRank: true,
  matchesPlayed: true,
  matchesWon: true,
  matchesDrawn: true,
  matchesLost: true,
  goalsFor: true,
  goalsAgainst: true,
  championships: true,
  runnerUps: true,
  semiFinals: true,
} as const;

export const revalidate = 0;

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();

  const tournament = await db.tournament.findUnique({
    where: { slug },
    include: {
      season: true,
      rules: true,
      announcements: { orderBy: { createdAt: "desc" } },
      groups: {
        include: {
          members: {
            include: {
              participant: {
                include: {
                  user: { select: { id: true, profile: { select: publicProfileFields } } },
                },
              },
            },
          },
          standings: {
            include: {
              user: { select: { id: true, profile: { select: publicProfileFields } } },
            },
            orderBy: [
              { points: "desc" },
              { goalDiff: "desc" },
              { goalsFor: "desc" },
            ],
          },
        },
      },
      matches: {
        include: {
          player1: { select: { id: true, profile: { select: publicProfileFields } } },
          player2: { select: { id: true, profile: { select: publicProfileFields } } },
          winner: { select: { id: true, profile: { select: publicProfileFields } } },
        },
        orderBy: { scheduledTime: "asc" },
      },
      brackets: {
        include: {
          match: {
            include: {
              player1: { select: { id: true, profile: { select: publicProfileFields } } },
              player2: { select: { id: true, profile: { select: publicProfileFields } } },
              winner: { select: { id: true, profile: { select: publicProfileFields } } },
            },
          },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
      hallOfFame: {
        include: {
          champion: { select: { id: true, profile: { select: publicProfileFields } } },
          runnerUp: { select: { id: true, profile: { select: publicProfileFields } } },
          thirdPlace: { select: { id: true, profile: { select: publicProfileFields } } },
        },
      },
      registrations: {
        where: { status: "APPROVED" },
        include: {
          user: { select: { id: true, profile: { select: publicProfileFields } } },
        },
      },
    },
  });

  if (!tournament) notFound();

  const confirmedCount = tournament.registrations.length;
  const availableSlots = Math.max(0, tournament.totalSlots - confirmedCount);

  let userRegistration = null;
  if (session) {
    userRegistration = await db.registration.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: tournament.id,
          userId: session.userId,
        },
      },
      include: { payment: true },
    });
  }

  const enrichedTournament = {
    ...tournament,
    confirmedSlots: confirmedCount,
    availableSlots,
    isFull: availableSlots === 0,
  };

  return (
    <TournamentDetailClient
      tournament={enrichedTournament}
      userRegistration={userRegistration}
      currentUserId={session?.userId || null}
    />
  );
}
