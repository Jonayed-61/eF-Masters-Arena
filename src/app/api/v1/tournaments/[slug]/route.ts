import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageTournament, getSession, requireAuth } from "@/lib/auth";
import { Role, TournamentStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

const publicProfileFields = {
  fullName: true, username: true, profilePicture: true, efootballIgn: true, teamName: true,
  country: true, rankingPoints: true, globalRank: true, matchesPlayed: true, matchesWon: true,
  matchesDrawn: true, matchesLost: true, goalsFor: true, goalsAgainst: true,
  championships: true, runnerUps: true, semiFinals: true,
} as const;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
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

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

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

    return NextResponse.json({
      success: true,
      tournament: {
        ...tournament,
        confirmedSlots: confirmedCount,
        availableSlots,
        isFull: availableSlots === 0,
      },
      userRegistration,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch tournament detail";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const { slug } = await params;
    const body = await req.json();

    const existing = await db.tournament.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (!(await canManageTournament(user, existing.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.status === TournamentStatus.COMPLETED) {
      return NextResponse.json({ error: "Use the tournament completion action after the final is confirmed." }, { status: 409 });
    }
    if (body.status && !Object.values(TournamentStatus).includes(body.status)) {
      return NextResponse.json({ error: "Invalid tournament status." }, { status: 400 });
    }

    const updated = await db.tournament.update({
      where: { id: existing.id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.name && { name: body.name }),
        ...(body.description && { description: body.description }),
        ...(body.totalSlots && { totalSlots: body.totalSlots }),
        ...(body.entryFee !== undefined && { entryFee: body.entryFee }),
        ...(body.prizePool !== undefined && { prizePool: body.prizePool }),
      },
    });

    await logAudit({
      userId: user.id,
      action: "TOURNAMENT_UPDATED",
      entity: "Tournament",
      entityId: existing.id,
      prevValue: { status: existing.status },
      newValue: { status: updated.status },
    });

    return NextResponse.json({ success: true, tournament: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update tournament";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
