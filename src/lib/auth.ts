import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Profile, Role, Viewer } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const email = data?.claims.email;
  if (error || typeof userId !== "string" || typeof email !== "string") return null;

  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profileData || String(profileData.status).toUpperCase() !== "ACTIVE") return null;
  const profile: Profile = {
    id: String(profileData.id),
    email: String(profileData.email),
    username: String(profileData.username),
    team_name: typeof profileData.team_name === "string" ? profileData.team_name : null,
    avatar_url: typeof profileData.avatar_url === "string" ? profileData.avatar_url : null,
    role: String(profileData.role).toUpperCase(),
    status: String(profileData.status).toUpperCase(),
    created_at: String(profileData.created_at),
    updated_at: String(profileData.updated_at),
  } as Profile;
  return { userId, email, profile };
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

