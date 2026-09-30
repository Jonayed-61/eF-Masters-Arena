import { z } from "zod";
import { FIXTURE_STATUSES, RESULT_TYPES } from "@/lib/constants";

export const loginSchema = z.object({
  identifier: z.string().trim().min(2).max(254),
  password: z.string().min(8).max(200),
  next: z.string().optional(),
});

const score = z.coerce.number().int().min(0).max(99);

export const resultSchema = z.object({
  fixtureId: z.string().uuid(),
  resultType: z.enum(RESULT_TYPES),
  homeActualGoals: score,
  awayActualGoals: score,
  bonusSide: z.enum(["HOME", "AWAY", "NONE"]),
}).superRefine((value, context) => {
  if (value.resultType === "NORMAL" && value.bonusSide !== "NONE") {
    context.addIssue({ code: "custom", path: ["bonusSide"], message: "Normal results cannot include bonus goals." });
  }
  if (value.resultType === "WALKOVER" && (value.homeActualGoals !== 0 || value.awayActualGoals !== 0)) {
    context.addIssue({ code: "custom", path: ["homeActualGoals"], message: "Walkover actual goals must be zero." });
  }
  if (value.resultType !== "NORMAL" && value.bonusSide === "NONE") {
    context.addIssue({ code: "custom", path: ["bonusSide"], message: "Select the side receiving the three-goal administrative award." });
  }
});

export const fixtureSchema = z.object({
  tournamentId: z.string().uuid(),
  matchweek: z.coerce.number().int().min(1).max(99),
  homePlayerId: z.string().uuid(),
  awayPlayerId: z.string().uuid(),
  matchDate: z.iso.date(),
  status: z.enum(FIXTURE_STATUSES),
  notes: z.string().trim().max(500).optional(),
}).refine((value) => value.homePlayerId !== value.awayPlayerId, {
  path: ["awayPlayerId"], message: "Home and away players must be different.",
}).refine((value) => ["SCHEDULED", "POSTPONED", "RESCHEDULED", "RESERVED", "CANCELLED"].includes(value.status), {
  path: ["status"], message: "A new fixture cannot start in a result or completed state.",
});

export const reserveRequestSchema = z.object({ fixtureId: z.string().uuid(), reserveDayId: z.string().uuid() });
export const resultResponseSchema = z.object({ submissionId: z.string().uuid(), response: z.enum(["CONFIRMED", "DISPUTED"]) });

export const profileSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_]+$/, "Use letters, numbers, and underscores only."),
  teamName: z.string().trim().max(60).optional(),
  avatarUrl: z.union([z.url(), z.literal("")]).optional(),
});

export const passwordSchema = z.object({ password: z.string().min(10).max(200) });

export const reviewSchema = z.object({
  submissionId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.decision === "REJECT" && !value.reason) context.addIssue({ code: "custom", path: ["reason"], message: "A rejection reason is required." });
});

export const penaltySchema = z.object({
  tournamentId: z.string().uuid(),
  playerId: z.string().uuid(),
  adjustment: z.coerce.number().int().min(-99).max(99).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(500),
});

export const reserveDaySchema = z.object({
  tournamentId: z.string().uuid(),
  reserveDate: z.iso.date(),
  maxMatches: z.coerce.number().int().min(1).max(10).default(2),
});

