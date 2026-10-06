import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserManagementClient } from "./UserManagementClient";

export const revalidate = 0;

export default async function UserManagementPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/?auth=login");
  if (actor.role !== Role.SUPER_ADMIN) redirect("/dashboard");
  const users = await db.user.findMany({
    select: { id: true, email: true, role: true, isBanned: true, createdAt: true, profile: { select: { fullName: true, username: true } }, _count: { select: { registrations: true, ownedTournaments: true } } },
    orderBy: { createdAt: "desc" },
  });
  return <UserManagementClient actorId={actor.id} users={users} />;
}
