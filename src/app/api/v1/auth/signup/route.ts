import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { signUpSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = signUpSchema.parse(body);

    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: validated.email },
          { profile: { username: validated.username } },
          { profile: { efootballId: validated.efootballId } },
        ],
      },
      include: { profile: true },
    });

    if (existingUser) {
      if (existingUser.email === validated.email) {
        return NextResponse.json({ error: "Email address is already registered." }, { status: 400 });
      }
      if (existingUser.profile?.username === validated.username) {
        return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
      }
      if (existingUser.profile?.efootballId === validated.efootballId) {
        return NextResponse.json({ error: "eFootball User ID is already registered." }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(validated.password);
    const userReferralCode = validated.username.toUpperCase() + Math.floor(100 + Math.random() * 900);

    const user = await db.user.create({
      data: {
        email: validated.email,
        passwordHash,
        referralCode: userReferralCode,
        profile: {
          create: {
            fullName: validated.fullName,
            username: validated.username,
            efootballId: validated.efootballId,
            efootballIgn: validated.efootballIgn,
            teamName: validated.teamName,
            whatsappNumber: validated.whatsappNumber,
            country: validated.country || "Bangladesh",
            bio: validated.bio || null,
          },
        },
      },
      include: { profile: true },
    });

    // Handle referral code if provided
    if (validated.referralCode) {
      const referrer = await db.user.findFirst({
        where: { referralCode: validated.referralCode },
      });
      if (referrer && referrer.id !== user.id) {
        await db.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
          },
        });
      }
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
    const errorMsg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
