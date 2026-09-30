import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { generateFixtures } from "@/lib/tournament";

const schema = z.object({ seasonId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const { seasonId } = schema.parse(await request.json());
    const { supabase } = await requireAdmin();
    const [{ data: season, error: seasonError }, { data: roster, error: playersError }, { count }] = await Promise.all([
      supabase!.from("seasons").select("id").eq("id", seasonId).single(),
      supabase!.from("season_players").select("user_id").eq("season_id", seasonId),
      supabase!.from("fixtures").select("id", { count: "exact", head: true }).eq("season_id", seasonId),
    ]);
    if (seasonError || playersError || !season) throw seasonError ?? playersError ?? new Error("Season not found.");
    if (count) return NextResponse.json({ error: "Fixtures already exist for this season." }, { status: 409 });
    if ((roster ?? []).length < 2) return NextResponse.json({ error: "Add at least two players to this season first." }, { status: 400 });
    const fixtures = generateFixtures((roster ?? []).map((entry) => entry.user_id), seasonId).map((fixture) => ({ season_id: fixture.seasonId, matchweek: fixture.matchweek, home_user_id: fixture.homeUserId, away_user_id: fixture.awayUserId, status: fixture.status, approval_status: fixture.approvalStatus }));
    const { error } = await supabase!.from("fixtures").insert(fixtures);
    if (error) throw error;
    await supabase!.from("audit_logs").insert({ season_id: seasonId, action: "fixtures_generated", performed_by: (await supabase!.auth.getUser()).data.user?.id, new_data: { fixture_count: fixtures.length } });
    return NextResponse.json({ generated: fixtures.length }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fixture generation failed.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
