import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Profile, Role, Viewer } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data || String(data.status).toUpperCase() !== "ACTIVE") return null;
  const profile = {
    ...data,
    role: String(data.role).toUpperCase(),
    status: String(data.status).toUpperCase(),
  } as Profile;
  return { userId: user.id, email: user.email, profile };
});

export async function requireViewer(role?: Role, returnTo?: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(returnTo ?? "/player/dashboard")}`);
  if (role && viewer.profile.role !== role) {
    redirect(viewer.profile.role === "ADMIN" ? "/admin/dashboard" : "/player/dashboard");
  }
  return viewer;
}

export function safeReturnPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

