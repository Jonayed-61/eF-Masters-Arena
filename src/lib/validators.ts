import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const tournamentCreateSchema = z.object({
  name: z.string().min(3, "Tournament name is required"),
  slug: z.string().min(3, "Slug is required"),
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
  registrationStart: z.string(),
  registrationEnd: z.string(),
  tournamentStart: z.string(),
  tournamentEnd: z.string().optional(),
  prizePool: z.number().min(0),
  championPrize: z.number().min(0),
  runnerUpPrize: z.number().min(0),
  thirdPlacePrize: z.number().min(0),
  format: z.enum(["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "GROUP_STAGE", "GROUP_AND_KNOCKOUT", "LEAGUE"]),
  organizer: z.string().default("eF Masters Arena Org"),
  teamType: z.string().default("Dream Team"),
  matchTimeMinutes: z.number().default(8),
  injuries: z.boolean().default(true),
  substitutions: z.number().default(5),
  groupExtraTime: z.boolean().default(false),
  knockoutExtraTime: z.boolean().default(true),
  knockoutPenalty: z.boolean().default(true),
});

export const paymentSubmissionSchema = z.object({
  method: z.enum(["bKash", "Nagad", "Rocket", "Gateway"], { errorMap: () => ({ message: "Unsupported payment method" }) }),
  senderNumber: z.string().trim().min(6, "Sender phone number is required").max(32),
  transactionId: z.string().trim().min(4, "Transaction ID (TrxID) is required").max(128),
  amount: z.number().finite().positive("Payment amount must be greater than zero"),
  screenshot: z.string().trim().min(5, "Payment screenshot is required").max(2048),
  couponCode: z.string().trim().max(64).optional(),
});

export const matchResultSubmissionSchema = z.object({
  playerScore: z.number().min(0).max(99),
  opponentScore: z.number().min(0).max(99),
  screenshot: z.string().min(5, "Match result screenshot URL is required"),
  notes: z.string().optional(),
});

export const disputeSubmissionSchema = z.object({
  matchId: z.string().min(1),
  reportedPlayerId: z.string().min(1),
  reason: z.string().min(3, "Reason for dispute is required"),
  description: z.string().min(10, "Detailed description of dispute is required"),
  evidenceUrl: z.string().optional(),
});
