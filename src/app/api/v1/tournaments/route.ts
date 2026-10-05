import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role, TournamentStatus } from "@prisma/client";
import { tournamentCreateSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const formatFilter = searchParams.get("format");
    const feeType = searchParams.get("feeType"); // free / paid
    const query = searchParams.get("q");

    const whereClause: Record<string, unknown> = {};

    if (statusFilter) {
      whereClause.status = statusFilter as TournamentStatus;
    }
    if (formatFilter) {
      whereClause.format = formatFilter;
    }
    if (feeType === "free") {
      whereClause.entryFee = 0;
    } else if (feeType === "paid") {
      whereClause.entryFee = { gt: 0 };
    }
    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        { organizer: { contains: query } },
      ];
    }

    const tournaments = await db.tournament.findMany({
      where: whereClause,
      include: {
        season: true,
        rules: true,
        registrations: {
          where: { status: "APPROVED" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedTournaments = tournaments.map((t) => {
      const confirmedCount = t.registrations.length;
      const availableSlots = Math.max(0, t.totalSlots - confirmedCount);
      return {
        ...t,
        confirmedSlots: confirmedCount,
        availableSlots,
        isFull: availableSlots === 0,
      };
    });

    return NextResponse.json({ success: true, tournaments: enrichedTournaments });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch tournaments";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN]);
    const body = await req.json();
    const val = tournamentCreateSchema.parse(body);

    const existing = await db.tournament.findUnique({ where: { slug: val.slug } });
    if (existing) {
      return NextResponse.json({ error: "Tournament slug already exists." }, { status: 400 });
    }

    const tournament = await db.tournament.create({
      data: {
        name: val.name,
        slug: val.slug,
        description: val.description,
        seasonId: val.seasonId || null,
        banner: val.banner || null,
        logo: val.logo || null,
        game: val.game,
        platform: val.platform,
        tournamentType: val.tournamentType,
        entryFee: val.entryFee,
        currency: val.currency,
        totalSlots: val.totalSlots,
        registrationStart: new Date(val.registrationStart),
        registrationEnd: new Date(val.registrationEnd),
        tournamentStart: new Date(val.tournamentStart),
        tournamentEnd: val.tournamentEnd ? new Date(val.tournamentEnd) : null,
        prizePool: val.prizePool,
        championPrize: val.championPrize,
        runnerUpPrize: val.runnerUpPrize,
        thirdPlacePrize: val.thirdPlacePrize,
        format: val.format,
        organizer: val.organizer,
        createdById: user.id,
        rules: {
          create: {
            teamType: val.teamType,
            matchTimeMinutes: val.matchTimeMinutes,
            injuries: val.injuries,
            substitutions: val.substitutions,
            groupExtraTime: val.groupExtraTime,
            knockoutExtraTime: val.knockoutExtraTime,
            knockoutPenalty: val.knockoutPenalty,
          },
        },
      },
      include: { rules: true },
    });

    await logAudit({
      userId: user.id,
      action: "TOURNAMENT_CREATED",
      entity: "Tournament",
      entityId: tournament.id,
      newValue: { name: tournament.name, slug: tournament.slug },
    });

    return NextResponse.json({ success: true, tournament });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create tournament";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
