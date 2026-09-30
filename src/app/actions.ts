"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireViewer, safeReturnPath } from "@/lib/auth";
import {
  fixtureSchema, loginSchema, passwordSchema, penaltySchema, profileSchema, reserveDaySchema,
  reserveRequestSchema, resultResponseSchema, resultSchema, reviewSchema,
} from "@/lib/validation";

export interface ActionState { ok: boolean; message: string }
const initialError = (message: string): ActionState => ({ ok: false, message });
const success = (message: string): ActionState => ({ ok: true, message });

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Check your login details.");
  const { identifier, password } = parsed.data;
  let email = identifier;
  if (!identifier.includes("@")) {
    try {
      const admin = createAdminSupabaseClient();
      const { data } = await admin.from("profiles").select("email,status").ilike("username", identifier).maybeSingle();
      if (!data?.email || String(data.status).toUpperCase() !== "ACTIVE") return initialError("Invalid email/username or password.");
      email = data.email as string;
    } catch {
      return initialError("Username login is temporarily unavailable. You can still use your email.");
    }
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return initialError("Invalid email/username or password.");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", data.user.id).single();
  if (!profile || String(profile.status).toUpperCase() !== "ACTIVE") {
    await supabase.auth.signOut();
    return initialError("This account is not active.");
  }
  const fallback = String(profile.role).toUpperCase() === "ADMIN" ? "/admin/dashboard" : "/player/dashboard";
  redirect(safeReturnPath(parsed.data.next ?? null, fallback));
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function submitResultAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("PLAYER");
  const parsed = resultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Invalid result.");
  const { fixtureId, resultType, homeActualGoals, awayActualGoals, bonusSide } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("submit_result", {
    p_fixture_id: fixtureId,
    p_result_type: resultType,
    p_home_actual_goals: homeActualGoals,
    p_away_actual_goals: awayActualGoals,
    p_home_bonus_goals: bonusSide === "HOME" ? 3 : 0,
    p_away_bonus_goals: bonusSide === "AWAY" ? 3 : 0,
  });
  if (error) return initialError(error.message);
  revalidatePath("/tournaments", "layout");
  return success("Result submitted. The unofficial table has been updated for Admin review.");
}

export async function respondToResultAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("PLAYER");
  const parsed = resultResponseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError("Invalid response.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("respond_to_result", { p_submission_id: parsed.data.submissionId, p_response: parsed.data.response });
  if (error) return initialError(error.message);
  revalidatePath("/tournaments", "layout");
  return success(parsed.data.response === "CONFIRMED" ? "Result confirmed." : "Dispute sent to the Admin.");
}

export async function requestReserveDayAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("PLAYER");
  const parsed = reserveRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError("Select a valid reserve day.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("request_reserve_day", { p_fixture_id: parsed.data.fixtureId, p_reserve_day_id: parsed.data.reserveDayId });
  if (error) return initialError(error.message);
  revalidatePath("/tournaments", "layout");
  return success("Reserve Day request sent to your opponent.");
}

export async function respondReserveDayAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("PLAYER");
  const requestId = String(formData.get("requestId") ?? "");
  const response = String(formData.get("response") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["ACCEPTED", "REJECTED"].includes(response)) return initialError("Invalid request response.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("respond_reserve_day", { p_request_id: requestId, p_response: response });
  if (error) return initialError(error.message);
  revalidatePath("/tournaments", "layout");
  return success(response === "ACCEPTED" ? "Fixture moved to the Reserve Day." : "Reserve Day request rejected.");
}

export async function updateProfileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Invalid profile.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_my_profile", { p_username: parsed.data.username, p_team_name: parsed.data.teamName || null, p_avatar_url: parsed.data.avatarUrl || null });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success("Profile updated everywhere.");
}

export async function changePasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Use a stronger password.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return initialError(error.message);
  return success("Password changed securely.");
}

export async function uploadAvatarAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return initialError("Choose an image to upload.");
  if (!file.type.startsWith("image/") || file.size > 2_000_000) return initialError("Use a JPG, PNG, or WebP image under 2 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const supabase = await createServerSupabaseClient();
  const path = `${viewer.userId}/avatar.${extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return initialError(uploadError.message);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.rpc("update_my_profile", { p_username: viewer.profile.username, p_team_name: viewer.profile.team_name, p_avatar_url: `${data.publicUrl}?v=${Date.now()}` });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success("Profile photo updated.");
}

export async function adminCreatePlayerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer("ADMIN");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const username = String(formData.get("username") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "") || null;
  if (!zodEmail(email) || !/^[A-Za-z0-9_]{3,32}$/.test(username) || password.length < 10) return initialError("Provide a valid email, username, and temporary password of at least 10 characters.");
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username, role: "PLAYER" } });
    if (error || !data.user) return initialError(error?.message ?? "Could not create player.");
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, email, username, team_name: teamName, role: "PLAYER", status: "ACTIVE" });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return initialError(profileError.message);
    }
    if (tournamentId) {
      const { error: participantError } = await admin.from("tournament_players").upsert({ tournament_id: tournamentId, player_id: data.user.id, status: "ACTIVE" }, { onConflict: "tournament_id,player_id" });
      if (participantError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return initialError(participantError.message);
      }
    }
    await admin.from("audit_logs").insert({ actor_id: viewer.userId, tournament_id: tournamentId, action: "PLAYER_CREATED", target_type: "profile", target_id: data.user.id, new_data: { username, email, team_name: teamName }, reason: "Admin provisioned login access" });
    revalidatePath("/admin", "layout");
    return success("Player account created securely.");
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Player provisioning is unavailable.");
  }
}

export async function adminUpdatePlayerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer("ADMIN");
  const playerId = String(formData.get("playerId") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(playerId) || !/^[A-Za-z0-9_]{3,32}$/.test(username) || !["ACTIVE", "INACTIVE"].includes(status)) return initialError("Invalid player update.");
  const admin = createAdminSupabaseClient();
  const { data: oldData } = await admin.from("profiles").select("username,team_name,status").eq("id", playerId).single();
  const { error } = await admin.from("profiles").update({ username, team_name: teamName, status }).eq("id", playerId).eq("role", "PLAYER");
  if (error) return initialError(error.message);
  await admin.from("audit_logs").insert({ actor_id: viewer.userId, action: "PLAYER_UPDATED", target_type: "profile", target_id: playerId, old_data: oldData, new_data: { username, team_name: teamName, status }, reason: "Admin player management" });
  revalidatePath("/", "layout");
  return success("Player updated everywhere by ID.");
}

export async function adminResetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer("ADMIN");
  const playerId = String(formData.get("playerId") ?? "");
  const password = String(formData.get("password") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(playerId) || password.length < 10 || !reason) return initialError("Player, a 10+ character password, and reason are required.");
  const admin = createAdminSupabaseClient();
  const { error } = await admin.auth.admin.updateUserById(playerId, { password });
  if (error) return initialError(error.message);
  await admin.from("audit_logs").insert({ actor_id: viewer.userId, action: "PLAYER_PASSWORD_RESET", target_type: "profile", target_id: playerId, reason });
  return success("Temporary password set. Share it through a secure channel.");
}

const zodEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function createFixtureAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const parsed = fixtureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Invalid fixture.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_create_fixture", {
    p_tournament_id: parsed.data.tournamentId, p_matchweek: parsed.data.matchweek,
    p_home_player_id: parsed.data.homePlayerId, p_away_player_id: parsed.data.awayPlayerId,
    p_match_date: parsed.data.matchDate, p_status: parsed.data.status, p_notes: parsed.data.notes || null,
  });
  if (error) return initialError(error.message);
  revalidatePath("/admin", "layout"); revalidatePath("/tournaments", "layout");
  return success("Fixture created.");
}

export async function reviewResultAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Invalid review.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_review_result", { p_submission_id: parsed.data.submissionId, p_decision: parsed.data.decision, p_reason: parsed.data.reason || null });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success(parsed.data.decision === "APPROVE" ? "Result approved. The official table is updated." : "Result rejected.");
}

export async function adminEnterResultAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const parsed = resultSchema.safeParse(Object.fromEntries(formData));
  const final = formData.get("final") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Invalid result.");
  if (!reason) return initialError("An administrative reason is required.");
  const value = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_enter_result", {
    p_fixture_id: value.fixtureId, p_result_type: value.resultType,
    p_home_actual_goals: value.homeActualGoals, p_away_actual_goals: value.awayActualGoals,
    p_home_bonus_goals: value.bonusSide === "HOME" ? 3 : 0, p_away_bonus_goals: value.bonusSide === "AWAY" ? 3 : 0,
    p_final: final, p_reason: reason,
  });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success(final ? "Final result entered and approved." : "Draft result entered into the unofficial table.");
}

export async function createReserveDayAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const parsed = reserveDaySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Invalid reserve day.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_create_reserve_day", { p_tournament_id: parsed.data.tournamentId, p_reserve_date: parsed.data.reserveDate, p_max_matches: parsed.data.maxMatches });
  if (error) return initialError(error.message);
  revalidatePath("/admin", "layout");
  return success("Reserve Day added.");
}

export async function applyPenaltyAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const parsed = penaltySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Invalid penalty.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_apply_penalty", { p_tournament_id: parsed.data.tournamentId, p_player_id: parsed.data.playerId, p_adjustment: parsed.data.adjustment, p_reason: parsed.data.reason });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success("Penalty adjustment applied and logged.");
}

export async function reversePenaltyAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const penaltyId = String(formData.get("penaltyId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(penaltyId) || !reason) return initialError("A valid penalty and reversal reason are required.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_reverse_penalty", { p_penalty_id: penaltyId, p_reason: reason });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success("Penalty reversed; history has been retained.");
}

export async function updateFixtureStatusAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const fixtureId = String(formData.get("fixtureId") ?? "");
  const status = String(formData.get("status") ?? "");
  const matchDate = String(formData.get("matchDate") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(fixtureId) || !["POSTPONED", "RESCHEDULED", "CANCELLED", "RESERVED", "SCHEDULED"].includes(status) || !reason) return initialError("Fixture, status, and reason are required.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_update_fixture_status", { p_fixture_id: fixtureId, p_status: status, p_match_date: matchDate, p_reason: reason });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success("Fixture updated and affected players notified.");
}

export async function updateTournamentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer("ADMIN");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const organizer = String(formData.get("organizer") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || null;
  const matchweek = Number(formData.get("currentMatchweek"));
  if (!/^[0-9a-f-]{36}$/i.test(tournamentId) || name.length < 3 || organizer.length < 2 || !["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"].includes(status) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(matchweek) || matchweek < 0) return initialError("Check all tournament settings.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_update_tournament", { p_tournament_id: tournamentId, p_name: name, p_organizer: organizer, p_status: status, p_start_date: startDate, p_end_date: endDate, p_current_matchweek: matchweek });
  if (error) return initialError(error.message);
  revalidatePath("/", "layout");
  return success("Tournament settings updated.");
}
