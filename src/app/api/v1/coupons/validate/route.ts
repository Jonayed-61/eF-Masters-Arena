import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { code, originalPrice } = await req.json();
    if (!code) return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });

    const coupon = await db.coupon.findUnique({
      where: { code: String(code).toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Coupon limit reached" }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    const price = Number(originalPrice) || 0;
    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = (price * coupon.discountVal) / 100;
    } else {
      discount = coupon.discountVal;
    }

    const finalPrice = Math.max(0, price - discount);

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountVal: coupon.discountVal,
        discountAmount: discount,
        finalPrice,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to validate coupon";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
