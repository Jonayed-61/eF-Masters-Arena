import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch Hall of Fame";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
