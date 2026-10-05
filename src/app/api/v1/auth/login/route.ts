import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email: validated.email },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ error: "Your account has been suspended/banned. Contact administrator." }, { status: 403 });
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.profile?.username || user.email,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });

    res.cookies.set("ef_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
