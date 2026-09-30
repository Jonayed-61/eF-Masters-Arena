import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  teamName: z.string().trim().min(2).max(100).optional(),
  teamLogo: z.string().url().nullable().optional(),
  gamePlayerId: z.string().trim().max(100).nullable().optional(),
  password: z.string().min(10).max(72).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); const { id } = await params; const input = updateSchema.parse(await request.json()); const admin = createAdminClient();
    if (input.password) { const { error } = await admin.auth.admin.updateUserById(id, { password: input.password }); if (error) throw error; }
    const profileUpdate: Record<string, unknown> = {};
    if (input.fullName !== undefined) profileUpdate.full_name = input.fullName;
    if (input.phone !== undefined) profileUpdate.phone = input.phone;
    if (input.active !== undefined) profileUpdate.status = input.active ? "active" : "inactive";
    if (Object.keys(profileUpdate).length) { const { error } = await admin.from("profiles").update(profileUpdate).eq("id", id); if (error) throw error; }
    const teamUpdate: Record<string, unknown> = {};
    if (input.teamName !== undefined) teamUpdate.team_name = input.teamName;
    if (input.teamLogo !== undefined) teamUpdate.team_logo = input.teamLogo;
    if (input.gamePlayerId !== undefined) teamUpdate.game_player_id = input.gamePlayerId;
    if (Object.keys(teamUpdate).length) { const { error } = await admin.from("teams").update(teamUpdate).eq("user_id", id); if (error) throw error; }
    return NextResponse.json({ updated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update player.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); const { id } = await params; const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ status: "inactive" }).eq("id", id).eq("role", "player");
    if (error) throw error;
    return NextResponse.json({ deactivated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deactivate player.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
