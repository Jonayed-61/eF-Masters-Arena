import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const inputSchema = z.object({
  email: z.string().trim().email(),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(12).max(128),
});

async function main() {
  const input = inputSchema.parse({ email: process.env.INITIAL_SUPER_ADMIN_EMAIL, username: process.env.INITIAL_SUPER_ADMIN_USERNAME, password: process.env.INITIAL_SUPER_ADMIN_PASSWORD });
  const db = new PrismaClient();
  try {
    if (await db.user.findFirst({ where: { role: Role.SUPER_ADMIN }, select: { id: true } })) throw new Error("A SUPER_ADMIN already exists; bootstrap was refused.");
    const conflict = await db.user.findFirst({ where: { OR: [{ email: input.email.toLowerCase() }, { profile: { username: input.username } }] }, select: { id: true } });
    if (conflict) throw new Error("The configured email or username is already in use.");
    await db.user.create({
      data: {
        email: input.email.toLowerCase(), passwordHash: await bcrypt.hash(input.password, 12), role: Role.SUPER_ADMIN, emailVerified: true,
        profile: { create: { fullName: input.username, username: input.username, efootballId: `ADMIN-${randomUUID()}`, efootballIgn: input.username, teamName: "Platform Administration", whatsappNumber: "not-provided" } },
      },
    });
    console.log("Initial SUPER_ADMIN created successfully.");
  } finally { await db.$disconnect(); }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Administrator bootstrap failed."); process.exitCode = 1; });

