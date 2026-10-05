import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, notifications });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch notifications";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

export async function PUT() {
  try {
    const user = await requireAuth();
    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, message: "Marked all as read" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update notifications";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
