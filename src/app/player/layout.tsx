import type { ReactNode } from "react";
import { requireViewer } from "@/lib/auth";
import { AppShell } from "@/components/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export default async function PlayerLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer("PLAYER", "/player/dashboard");
  return <AppShell viewer={viewer}><RealtimeRefresh />{children}</AppShell>;
}

