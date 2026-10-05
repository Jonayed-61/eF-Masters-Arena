import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        profile: user.profile,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
