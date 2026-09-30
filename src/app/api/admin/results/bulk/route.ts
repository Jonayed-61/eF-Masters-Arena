import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({ fixtureIds: z.array(z.string().uuid()).min(1).max(100) });

export async function POST(request: Request) {
  try {
    const { fixtureIds } = schema.parse(await request.json());
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase!.rpc("bulk_approve_results", { p_fixture_ids: fixtureIds });
    if (error) throw error;
    return NextResponse.json({ approved: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk approval failed.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
