import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { db } from "./db";
import { getServerEnv } from "./env";

const JWT_SECRET = new TextEncoder().encode(getServerEnv().JWT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  username: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ef_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const currentUser = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, isBanned: true, profile: { select: { username: true } } },
  });
  if (!currentUser || currentUser.isBanned) return null;
  return {
    userId: currentUser.id,
    email: currentUser.email,
    role: currentUser.role,
    username: currentUser.profile?.username || currentUser.email,
  };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      profile: true,
    },
  });

  if (!user || user.isBanned) return null;
  return user;
}

export async function requireAuth(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    throw new Error(`Forbidden: Role '${user.role}' is not authorized to access this resource`);
  }

  return user;
}

export async function canManageTournament(user: { id: string; role: Role }, tournamentId: string) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role !== Role.TOURNAMENT_ADMIN) return false;
  const ownedTournament = await db.tournament.findFirst({
    where: { id: tournamentId, createdById: user.id },
    select: { id: true },
  });
  return Boolean(ownedTournament);
}
