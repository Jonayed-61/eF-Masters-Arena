import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resultSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = resultSchema.parse(await request.json());
    const { supabase } = await requireUser();
    const { data, error } = await supabase!.rpc("submit_fixture_result", {
      p_fixture_id: input.fixtureId,
      p_home_score: input.homeScore,
      p_away_score: input.awayScore,
      p_screenshot_url: input.screenshotUrl ?? null,
    });
    if (error) throw error;
    return NextResponse.json({ fixture: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit result.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
