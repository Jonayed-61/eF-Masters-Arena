"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase.channel(`season:${seasonId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fixtures", filter: `season_id=eq.${seasonId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => router.refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [router, seasonId]);
  return null;
}
