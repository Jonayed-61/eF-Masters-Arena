import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/permissions";

const PLATFORM_SETTING_KEYS = ["PLATFORM_DISPLAY_NAME", "SUPPORT_CONTACT", "WHATSAPP_COMMUNITY", "DISCORD_LINK", "DEFAULT_PAYMENT_INSTRUCTIONS"] as const;
const settingsSchema = z.object({ settings: z.record(z.enum(PLATFORM_SETTING_KEYS), z.string().trim().max(2000)) }).strict();

export async function PUT(req: Request) {
  try {
    const actor = await requireRole(Role.SUPER_ADMIN);
    const { settings } = settingsSchema.parse(await req.json());
    await db.$transaction(Object.entries(settings).map(([key, value]) => db.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } })));
    await logAudit({ userId: actor.id, action: "PLATFORM_SETTINGS_UPDATED", entity: "SystemSetting", newValue: { keys: Object.keys(settings) } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Platform settings could not be saved.");
  }
}
