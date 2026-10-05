import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageTournament, requireAuth } from "@/lib/auth";
import { DisputeStatus, MatchStatus, Role } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAuth([Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN, Role.MODERATOR]);
    const { id } = await params;
    const body = await req.json();

    const existingDispute = await db.dispute.findUnique({
      where: { id },
      include: { match: { select: { tournamentId: true } } },
    });
    if (!existingDispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    if (admin.role === Role.TOURNAMENT_ADMIN && !(await canManageTournament(admin, existingDispute.match.tournamentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const decision = typeof body.adminDecision === "string" && body.adminDecision.trim()
      ? body.adminDecision.trim().slice(0, 200)
      : "Resolved by moderator";
    const notes = typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 2000) : "";
    const status = body.status === DisputeStatus.REJECTED ? DisputeStatus.REJECTED : DisputeStatus.RESOLVED;

    const dispute = await db.$transaction(async (tx) => {
      const updated = await tx.dispute.update({
        where: { id },
        data: { status, adminDecision: decision, adminNotes: notes },
        include: {
          reporter: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
          reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true } } } },
        },
      });
      await tx.match.update({ where: { id: existingDispute.matchId }, data: { status: MatchStatus.CONFIRMED } });
      return updated;
    });

    await db.notification.create({
      data: {
        userId: dispute.reporterId,
        title: "⚖️ Dispute Decision Published",
        message: `Decision for reported match: ${decision}`,
        link: `/disputes`,
      },
    });

    await logAudit({
      userId: admin.id,
      action: "DISPUTE_RESOLVED",
      entity: "Dispute",
      entityId: dispute.id,
      newValue: { decision, status },
    });

    return NextResponse.json({ success: true, message: "Dispute resolved", dispute });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to resolve dispute";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
