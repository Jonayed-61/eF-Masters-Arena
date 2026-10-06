import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10) || 50));
    const where = query
      ? {
          OR: [
            { username: { contains: query } },
            { fullName: { contains: query } },
            { teamName: { contains: query } },
            { efootballIgn: { contains: query } },
          ],
        }
      : undefined;

    const profiles = await db.profile.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            _count: { select: { achievements: true } },
          },
        },
      },
      orderBy: [
        { rankingPoints: "desc" },
        { championships: "desc" },
        { matchesWon: "desc" },
      ],
    });

    const total = await db.profile.count({ where });
    const rankedProfiles = profiles.map((p, idx) => {
      const publicProfile = { ...p, efootballId: undefined, whatsappNumber: undefined };
      return { rank: (page - 1) * limit + idx + 1, ...publicProfile };
    });

    return NextResponse.json({ success: true, rankings: rankedProfiles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err: unknown) {
    return handleApiError(err, "Rankings could not be loaded.");
  }
}
