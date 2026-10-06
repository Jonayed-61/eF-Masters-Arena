import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;

    const profile = await db.profile.findUnique({
      where: { username },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            achievements: {
              include: { achievement: true },
            },
            registrations: {
              include: {
                tournament: {
                  include: { season: true, hallOfFame: true },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
    }

    const totalMatches = profile.matchesPlayed || 1;
    const winRate = ((profile.matchesWon / totalMatches) * 100).toFixed(1);

    const publicProfile = { ...profile, whatsappNumber: undefined, efootballId: undefined };

    return NextResponse.json({
      success: true,
      profile: {
        ...publicProfile,
        winRate: `${winRate}%`,
      },
    });
  } catch (err: unknown) {
    return handleApiError(err, "Player profile could not be loaded.");
  }
}
