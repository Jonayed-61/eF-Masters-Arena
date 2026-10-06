import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { TournamentStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";
import { AppError, handleApiError } from "@/lib/api-response";
import { assertTournamentTransition } from "@/lib/tournament/lifecycle";
import { tournamentUpdateSchema } from "@/lib/validators";

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
    if (tournament.status === TournamentStatus.DRAFT && (!session || session.userId !== tournament.createdById)) {
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
    return handleApiError(err, "Tournament details could not be loaded.");
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = tournamentUpdateSchema.parse(await req.json());

    const existing = await db.tournament.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const user = await requireTournamentOwnerOrSuperAdmin(existing.id);
    if (body.status) assertTournamentTransition(existing.status, body.status as TournamentStatus);
    const approvedCount = await db.registration.count({ where: { tournamentId: existing.id, status: "APPROVED" } });
    if (body.totalSlots !== undefined && body.totalSlots < approvedCount) throw new AppError("CAPACITY_BELOW_PARTICIPANTS", "Capacity cannot be lower than the approved participant count.", 409);
    const progressionExists = await db.match.count({ where: { tournamentId: existing.id } });
    if (progressionExists > 0 && (body.totalSlots !== undefined || body.entryFee !== undefined)) throw new AppError("TOURNAMENT_ALREADY_STARTED", "Capacity and entry fee cannot change after fixtures exist.", 409);
    if ((body.entryFee ?? existing.entryFee) > 0 && body.paymentInstructions === null) throw new AppError("PAYMENT_INSTRUCTIONS_REQUIRED", "Paid tournaments require payment instructions.", 400);

    const updated = await db.tournament.update({
      where: { id: existing.id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.name && { name: body.name }),
        ...(body.description && { description: body.description }),
        ...(body.totalSlots && { totalSlots: body.totalSlots }),
        ...(body.entryFee !== undefined && { entryFee: body.entryFee }),
        ...(body.prizePool !== undefined && { prizePool: body.prizePool }),
        ...(body.paymentInstructions !== undefined && { paymentInstructions: body.paymentInstructions }),
        ...(body.contactInfo !== undefined && { contactInfo: body.contactInfo }),
        ...(body.status && existing.status === TournamentStatus.DRAFT && body.status !== TournamentStatus.DRAFT && { publishedAt: new Date() }),
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
    return handleApiError(err, "Tournament could not be updated.");
  }
}
