import { z } from "zod";

export const resultSchema = z.object({
  fixtureId: z.string().uuid(),
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
  screenshotUrl: z.string().trim().max(500).nullable().optional(),
});

export const responseSchema = z.object({
  response: z.enum(["confirmed", "disputed"]),
  reason: z.string().trim().max(500).optional(),
}).refine((value) => value.response !== "disputed" || Boolean(value.reason), { message: "A dispute reason is required.", path: ["reason"] });

export const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("correct"), homeScore: z.coerce.number().int().min(0).max(99), awayScore: z.coerce.number().int().min(0).max(99), reason: z.string().trim().min(3).max(500) }),
]);

export const createPlayerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(10).max(72),
  teamName: z.string().trim().min(2).max(100),
  gamePlayerId: z.string().trim().max(100).optional(),
});
