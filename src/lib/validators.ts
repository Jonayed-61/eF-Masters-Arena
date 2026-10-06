import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  fullName: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric and underscores"),
  efootballId: z.string().min(3, "eFootball User ID is required"),
  efootballIgn: z.string().min(2, "In-Game Name (IGN) is required"),
  teamName: z.string().min(2, "Team name is required"),
  whatsappNumber: z.string().min(6, "Valid WhatsApp number is required"),
  country: z.string().default("Bangladesh"),
  bio: z.string().optional(),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const tournamentCreateSchema = z.object({
  name: z.string().min(3, "Tournament name is required"),
  slug: z.string().trim().min(3, "Slug is required").max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  seasonId: z.string().optional(),
  banner: z.string().optional(),
  logo: z.string().optional(),
  game: z.string().default("eFootball Mobile"),
  platform: z.string().default("Mobile (Android/iOS)"),
  tournamentType: z.string().default("Open Tournament"),
  entryFee: z.number().min(0),
  currency: z.string().default("BDT"),
  totalSlots: z.number().min(4).max(128),
  minimumParticipants: z.number().int().min(2).max(128).default(2),
  groupCount: z.number().int().min(1).max(8).default(4),
  qualifiersPerGroup: z.number().int().min(1).max(4).default(2),
  registrationStart: z.string().datetime(),
  registrationEnd: z.string().datetime(),
  tournamentStart: z.string().datetime(),
  tournamentEnd: z.string().datetime().optional(),
  prizePool: z.number().min(0),
  championPrize: z.number().min(0),
  runnerUpPrize: z.number().min(0),
  thirdPlacePrize: z.number().min(0),
  format: z.enum(["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "GROUP_STAGE", "GROUP_AND_KNOCKOUT", "LEAGUE"]),
  organizer: z.string().default("eF Masters Arena Org"),
  paymentInstructions: z.string().trim().max(2000).optional(),
  contactInfo: z.string().trim().max(500).optional(),
  teamType: z.string().default("Dream Team"),
  matchTimeMinutes: z.number().default(8),
  injuries: z.boolean().default(true),
  substitutions: z.number().default(5),
  groupExtraTime: z.boolean().default(false),
  knockoutExtraTime: z.boolean().default(true),
  knockoutPenalty: z.boolean().default(true),
  customRules: z.string().trim().max(10000).optional(),
}).superRefine((value, context) => {
  const registrationStart = new Date(value.registrationStart);
  const registrationEnd = new Date(value.registrationEnd);
  const tournamentStart = new Date(value.tournamentStart);
  const tournamentEnd = value.tournamentEnd ? new Date(value.tournamentEnd) : null;
  if (registrationStart >= registrationEnd) context.addIssue({ code: "custom", path: ["registrationEnd"], message: "Registration end must be after registration start" });
  if (registrationEnd > tournamentStart) context.addIssue({ code: "custom", path: ["tournamentStart"], message: "Tournament start must not precede registration end" });
  if (tournamentEnd && tournamentEnd < tournamentStart) context.addIssue({ code: "custom", path: ["tournamentEnd"], message: "Tournament end must not precede tournament start" });
  if (value.minimumParticipants > value.totalSlots) context.addIssue({ code: "custom", path: ["minimumParticipants"], message: "Minimum participants cannot exceed total slots" });
  if (value.entryFee > 0 && !value.paymentInstructions) context.addIssue({ code: "custom", path: ["paymentInstructions"], message: "Paid tournaments require payment instructions" });
});

export const tournamentUpdateSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(10).max(10000).optional(),
  status: z.enum(["DRAFT", "UPCOMING", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "GROUP_STAGE", "KNOCKOUT_STAGE", "ONGOING", "CANCELLED"]).optional(),
  totalSlots: z.number().int().min(4).max(128).optional(),
  entryFee: z.number().finite().min(0).optional(),
  prizePool: z.number().finite().min(0).optional(),
  paymentInstructions: z.string().trim().max(2000).nullable().optional(),
  contactInfo: z.string().trim().max(500).nullable().optional(),
}).strict();

export const tournamentRegistrationSchema = z.object({
  couponCode: z.string().trim().max(64).optional(),
  registrationData: z.string().trim().max(2000).optional(),
}).strict();

const storedImageReference = z.string().trim().max(2048).refine((value) => {
  if (/^\/uploads\/[a-z-]+\/[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Image reference must be a managed upload or secure object-storage URL");

export const paymentSubmissionSchema = z.object({
  method: z.enum(["bKash", "Nagad", "Rocket", "Gateway"], { errorMap: () => ({ message: "Unsupported payment method" }) }),
  senderNumber: z.string().trim().min(6, "Sender phone number is required").max(32),
  transactionId: z.string().trim().min(4, "Transaction ID (TrxID) is required").max(128),
  amount: z.number().finite().positive("Payment amount must be greater than zero"),
  screenshot: storedImageReference,
  couponCode: z.string().trim().max(64).optional(),
});

export const paymentDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
}).strict();

export const matchVerificationSchema = z.object({
  player1Score: z.number().int().min(0).max(99),
  player2Score: z.number().int().min(0).max(99),
}).strict();

export const disputeResolutionSchema = z.object({
  status: z.enum(["RESOLVED", "REJECTED"]),
  adminDecision: z.string().trim().min(3).max(200),
  adminNotes: z.string().trim().max(2000).optional(),
}).strict();

export const matchResultSubmissionSchema = z.object({
  playerScore: z.number().min(0).max(99),
  opponentScore: z.number().min(0).max(99),
  screenshot: storedImageReference,
  notes: z.string().optional(),
});

export const disputeSubmissionSchema = z.object({
  matchId: z.string().min(1),
  reportedPlayerId: z.string().min(1),
  reason: z.string().min(3, "Reason for dispute is required"),
  description: z.string().min(10, "Detailed description of dispute is required"),
  evidenceUrl: storedImageReference.optional(),
});
