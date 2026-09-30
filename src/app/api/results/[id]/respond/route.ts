import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { responseSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = responseSchema.parse(await request.json());
    const { supabase } = await requireUser();
    const { data, error } = await supabase!.rpc("respond_to_result", { p_fixture_id: id, p_response: input.response, p_reason: input.reason ?? null });
    if (error) throw error;
    return NextResponse.json({ fixture: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to respond.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
