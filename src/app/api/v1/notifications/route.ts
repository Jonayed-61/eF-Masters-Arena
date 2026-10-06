import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, notifications });
  } catch (err: unknown) {
    return handleApiError(err, "Notifications could not be loaded.");
  }
}

export async function PUT() {
  try {
    const user = await requireUser();
    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, message: "Marked all as read" });
  } catch (err: unknown) {
    return handleApiError(err, "Notifications could not be updated.");
  }
}
