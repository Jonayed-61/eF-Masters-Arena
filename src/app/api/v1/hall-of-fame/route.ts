import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const hallOfFame = await db.hallOfFame.findMany({
      include: {
        tournament: { select: { id: true, name: true, slug: true, banner: true, season: true } },
        champion: { include: { profile: true } },
        runnerUp: { include: { profile: true } },
        thirdPlace: { include: { profile: true } },
      },
      orderBy: { dateCompleted: "desc" },
    });

    return NextResponse.json({ success: true, hallOfFame });
  } catch (err: unknown) {
    return handleApiError(err, "Hall of Fame could not be loaded.");
  }
}
