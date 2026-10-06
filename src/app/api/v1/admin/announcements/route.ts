import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";

const schema = z.object({ title: z.string().trim().min(3).max(120), content: z.string().trim().min(3).max(4000) }).strict();

export async function POST(req: Request) {
  try {
    const actor = await requireRole(Role.SUPER_ADMIN);
    const body = schema.parse(await req.json());
    const announcement = await db.announcement.create({ data: { ...body, isGlobal: true } });
    await logAudit({ userId: actor.id, action: "PLATFORM_ANNOUNCEMENT_CREATED", entity: "Announcement", entityId: announcement.id, newValue: body });
    return Response.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Platform announcement could not be published.");
  }
}
