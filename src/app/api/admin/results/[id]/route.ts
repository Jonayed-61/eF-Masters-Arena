import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { reviewSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = reviewSchema.parse(await request.json());
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase!.rpc("review_fixture_result", {
      p_fixture_id: id,
      p_action: input.action,
      p_home_score: input.action === "correct" ? input.homeScore : null,
      p_away_score: input.action === "correct" ? input.awayScore : null,
      p_reason: "reason" in input ? input.reason : null,
    });
    if (error) throw error;
    return NextResponse.json({ fixture: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review result.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
