import "server-only";
import { createClient } from "./supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, profile: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile };
}

export async function requireUser() {
  const context = await getCurrentUser();
  if (!context.user || !context.profile) throw new Error("UNAUTHORIZED");
  return context;
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.profile.role !== "admin") throw new Error("FORBIDDEN");
  return context;
}
