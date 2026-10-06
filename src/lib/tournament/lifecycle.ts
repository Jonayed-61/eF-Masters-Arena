import { MatchStatus, RegistrationStatus, TournamentStatus } from "@prisma/client";
import { AppError } from "../api-response";

const allowedTournamentTransitions: Record<TournamentStatus, readonly TournamentStatus[]> = {
  DRAFT: [TournamentStatus.UPCOMING, TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED],
  UPCOMING: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED],
  REGISTRATION_OPEN: [TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.CANCELLED],
  REGISTRATION_CLOSED: [TournamentStatus.GROUP_STAGE, TournamentStatus.ONGOING, TournamentStatus.CANCELLED],
  GROUP_STAGE: [TournamentStatus.KNOCKOUT_STAGE, TournamentStatus.COMPLETED, TournamentStatus.CANCELLED],
  KNOCKOUT_STAGE: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED],
  ONGOING: [TournamentStatus.GROUP_STAGE, TournamentStatus.KNOCKOUT_STAGE, TournamentStatus.COMPLETED, TournamentStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertTournamentTransition(current: TournamentStatus, next: TournamentStatus) {
  if (current === next) return;
  if (!allowedTournamentTransitions[current].includes(next)) {
    throw new AppError("INVALID_TOURNAMENT_TRANSITION", `Tournament cannot move from ${current} to ${next}.`, 409);
  }
}

export function assertRegistrationAllowed(input: {
  status: TournamentStatus;
  registrationStart: Date;
  registrationEnd: Date;
  confirmedCount: number;
  totalSlots: number;
  isBanned: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (input.isBanned) throw new AppError("ACCOUNT_BANNED", "Banned accounts cannot register.", 403);
  if (input.status !== TournamentStatus.REGISTRATION_OPEN) throw new AppError("REGISTRATION_CLOSED", "Registration is not open for this tournament.", 409);
  if (now < input.registrationStart) throw new AppError("REGISTRATION_NOT_STARTED", "Registration has not opened yet.", 409);
  if (now > input.registrationEnd) throw new AppError("REGISTRATION_CLOSED", "The registration deadline has passed.", 409);
  if (input.confirmedCount >= input.totalSlots) throw new AppError("TOURNAMENT_FULL", "This tournament is full.", 409);
}

export function assertMatchCanAcceptSubmission(status: MatchStatus) {
  if (!new Set<MatchStatus>([MatchStatus.SCHEDULED, MatchStatus.WAITING, MatchStatus.RESULT_SUBMITTED, MatchStatus.UNDER_REVIEW]).has(status)) {
    throw new AppError("MATCH_NOT_ACCEPTING_RESULTS", "This match is not accepting result submissions.", 409);
  }
}

export function isFinalRegistrationStatus(status: RegistrationStatus) {
  return status === RegistrationStatus.APPROVED || status === RegistrationStatus.CANCELLED;
}

