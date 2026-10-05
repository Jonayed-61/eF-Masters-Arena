import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { DisputeAdminClient } from "./DisputeAdminClient";

export const revalidate = 0;

export default async function AdminDisputesPage() {
  const user = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN, Role.MODERATOR]);
  const disputes = await db.dispute.findMany({
    where: user.role === Role.TOURNAMENT_ADMIN
      ? { match: { tournament: { createdById: user.id } } }
      : undefined,
    include: {
      match: { include: { tournament: true } },
      reporter: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
      reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
      evidence: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <DisputeAdminClient disputes={disputes} userRole={user.role} />;
}