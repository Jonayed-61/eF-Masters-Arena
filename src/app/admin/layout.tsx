import type { ReactNode } from "react";
import { requireViewer } from "@/lib/auth";
import { AppShell } from "@/components/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer("ADMIN", "/admin/dashboard");
  return <AppShell viewer={viewer}><RealtimeRefresh />{children}</AppShell>;
}
