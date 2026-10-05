import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const allowed = user && (user.role === Role.SUPER_ADMIN || user.role === Role.TOURNAMENT_ADMIN || user.role === Role.MODERATOR);

  if (!allowed) redirect("/?auth=login");

  return <AdminShell userRole={user.role}>{children}</AdminShell>;
}