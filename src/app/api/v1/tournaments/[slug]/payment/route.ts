import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { submitPaymentProof } from "@/lib/payments";
import { requireUser } from "@/lib/permissions";
import { paymentSubmissionSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireUser();
    const { slug } = await params;
    const input = paymentSubmissionSchema.omit({ couponCode: true }).parse(await req.json());
    const payment = await submitPaymentProof(slug, user.id, input);
    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, "Payment proof could not be submitted.");
  }
}
