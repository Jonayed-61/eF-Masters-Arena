import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { AppError, handleApiError } from "@/lib/api-response";
import { requireTournamentOwnerOrSuperAdmin } from "@/lib/permissions";

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(3).max(4000),
}).strict();

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = announcementSchema.parse(await req.json());
    const tournament = await db.tournament.findUnique({ where: { slug }, select: { id: true } });
    if (!tournament) throw new AppError("TOURNAMENT_NOT_FOUND", "Tournament not found.", 404);
    const user = await requireTournamentOwnerOrSuperAdmin(tournament.id);
    const announcement = await db.announcement.create({ data: { tournamentId: tournament.id, ...body } });
    await logAudit({ userId: user.id, action: "ANNOUNCEMENT_CREATED", entity: "Announcement", entityId: announcement.id, newValue: body });
    return Response.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Announcement could not be published.");
  }
}
