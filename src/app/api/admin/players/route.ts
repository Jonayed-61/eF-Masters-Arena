import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPlayerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let createdUserId: string | null = null;
  try {
    await requireAdmin();
    const input = createPlayerSchema.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName, username: input.username } });
    if (error || !data.user) throw error ?? new Error("Account creation failed.");
    createdUserId = data.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, full_name: input.fullName, username: input.username, email: input.email, phone: input.phone ?? null, role: "player", status: "active" });
    if (profileError) { await admin.auth.admin.deleteUser(data.user.id); throw profileError; }
    const { error: teamError } = await admin.from("teams").insert({ user_id: data.user.id, team_name: input.teamName, game_player_id: input.gamePlayerId ?? null });
    if (teamError) throw teamError;
    const { data: activeSeason } = await admin.from("seasons").select("id").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (activeSeason) {
      const { error: rosterError } = await admin.from("season_players").insert({ season_id: activeSeason.id, user_id: data.user.id });
      if (rosterError) throw rosterError;
    }
    return NextResponse.json({ id: data.user.id }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      try { await createAdminClient().auth.admin.deleteUser(createdUserId); } catch { /* Preserve the original error. */ }
    }
    const message = error instanceof Error ? error.message : "Unable to create player.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
