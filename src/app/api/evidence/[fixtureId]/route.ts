import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  try {
    const { fixtureId } = await params;
    const { supabase, user, profile } = await requireUser();
    const { data: fixture, error } = await supabase!.from("fixtures").select("home_user_id, away_user_id, result_screenshot").eq("id", fixtureId).single();
    if (error || !fixture?.result_screenshot) return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
    if (profile.role !== "admin" && ![fixture.home_user_id, fixture.away_user_id].includes(user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data, error: signError } = await supabase!.storage.from("result-screenshots").createSignedUrl(fixture.result_screenshot, 60);
    if (signError) throw signError;
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open evidence.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
