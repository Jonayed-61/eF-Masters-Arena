import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createMatchDispute } from "@/lib/disputes";
import { requireUser } from "@/lib/permissions";
import { disputeSubmissionSchema } from "@/lib/validators";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireUser();

    let disputes;
    if (user.role === "SUPER_ADMIN" || user.role === "MODERATOR") {
      disputes = await db.dispute.findMany({
        include: {
          match: { include: { tournament: true } },
          reporter: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          evidence: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "TOURNAMENT_ADMIN") {
      disputes = await db.dispute.findMany({
        where: { match: { tournament: { createdById: user.id } } },
        include: {
          match: { include: { tournament: true } },
          reporter: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          evidence: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      disputes = await db.dispute.findMany({
        where: {
          OR: [{ reporterId: user.id }, { reportedPlayerId: user.id }],
        },
        include: {
          match: { include: { tournament: true } },
          reporter: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          reportedPlayer: { select: { id: true, profile: { select: { username: true, fullName: true, profilePicture: true } } } },
          evidence: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (user.role === "PLAYER") disputes = disputes.map((dispute) => ({ ...dispute, adminNotes: undefined, resolvedById: undefined }));
    return NextResponse.json({ success: true, disputes });
  } catch (err: unknown) {
    return handleApiError(err, "Disputes could not be loaded.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const val = disputeSubmissionSchema.parse(body);
    const dispute = await createMatchDispute(user.id, val);

    return NextResponse.json({ success: true, message: "Dispute reported to admins", dispute });
  } catch (err: unknown) {
    return handleApiError(err, "The dispute could not be filed.");
  }
}
