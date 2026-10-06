import { BanStatus, Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { AppError, handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";

const updateUserSchema = z.object({ role: z.nativeEnum(Role).optional(), isBanned: z.boolean().optional(), reason: z.string().trim().min(3).max(500).optional() }).strict()
  .refine((value) => value.role !== undefined || value.isBanned !== undefined, "No changes supplied.")
  .refine((value) => value.isBanned !== true || value.reason, { path: ["reason"], message: "A ban reason is required." });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(Role.SUPER_ADMIN);
    const { id } = await params;
    const body = updateUserSchema.parse(await req.json());
    if (id === actor.id) throw new AppError("SELF_CHANGE_FORBIDDEN", "Use another super administrator to change your own access.", 409);
    const existing = await db.user.findUnique({ where: { id }, select: { role: true, isBanned: true } });
    if (!existing) throw new AppError("USER_NOT_FOUND", "User not found.", 404);
    const user = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { ...(body.role && { role: body.role }), ...(body.isBanned !== undefined && { isBanned: body.isBanned }) }, select: { id: true, role: true, isBanned: true } });
      if (body.isBanned === true) await tx.playerBan.create({ data: { userId: id, issuerId: actor.id, status: BanStatus.PERMANENT_BAN, reason: body.reason! } });
      if (body.isBanned === false) await tx.playerBan.updateMany({ where: { userId: id, isActive: true }, data: { isActive: false, endDate: new Date() } });
      return updated;
    });
    await logAudit({ userId: actor.id, action: "USER_ACCESS_UPDATED", entity: "User", entityId: id, prevValue: existing, newValue: { ...user, reason: body.reason } });
    return Response.json({ success: true, user });
  } catch (error) {
    return handleApiError(error, "User access could not be updated.");
  }
}
