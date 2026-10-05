import { db } from "./db";

export async function logAudit({
  userId,
  action,
  entity,
  entityId,
  prevValue,
  newValue,
  ipAddress,
}: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  prevValue?: Record<string, unknown> | string | null;
  newValue?: Record<string, unknown> | string | null;
  ipAddress?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        prevValue: prevValue ? (typeof prevValue === "string" ? prevValue : JSON.stringify(prevValue)) : null,
        newValue: newValue ? (typeof newValue === "string" ? newValue : JSON.stringify(newValue)) : null,
        ipAddress: ipAddress || "127.0.0.1",
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
