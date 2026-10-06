import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlatformSettingsClient } from "./PlatformSettingsClient";

export const revalidate = 0;

export default async function PlatformSettingsPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/?auth=login");
  if (actor.role !== Role.SUPER_ADMIN) redirect("/dashboard");
  const [rows, announcements] = await Promise.all([db.systemSetting.findMany(), db.announcement.findMany({ where: { isGlobal: true }, orderBy: { createdAt: "desc" }, take: 10 })]);
  return <PlatformSettingsClient initialSettings={Object.fromEntries(rows.map((row) => [row.key, row.value]))} announcements={announcements} />;
}
