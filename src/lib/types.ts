export type ApprovalStatus = "none" | "pending" | "approved" | "rejected" | "corrected";
export type FixtureStatus = "upcoming" | "result_submitted" | "pending_approval" | "completed" | "postponed" | "cancelled";
export type ConfirmationStatus = "pending" | "confirmed" | "disputed";

export interface Player {
  id: string;
  name: string;
  username: string;
  teamName: string;
  teamLogo?: string | null;
  profileImage?: string | null;
  gamePlayerId?: string | null;
  active?: boolean;
}

export interface Fixture {
  id: string;
  seasonId: string;
  matchweek: number;
  homeUserId: string;
  awayUserId: string;
  matchDate?: string | null;
  matchTime?: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureStatus;
  approvalStatus: ApprovalStatus;
  submittedBy?: string | null;
  submittedAt?: string | null;
  opponentConfirmation?: ConfirmationStatus;
  resultScreenshot?: string | null;
  disputeReason?: string | null;
}

export interface Standing {
  position: number;
  playerId: string;
  playerName: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ("W" | "D" | "L")[];
}

export interface HeadToHead {
  playerA: Player;
  playerB: Player;
  matchesPlayed: number;
  playerAWins: number;
  playerBWins: number;
  draws: number;
  playerAGoals: number;
  playerBGoals: number;
  playerAGoalDifference: number;
  playerBGoalDifference: number;
  averageGoals: number;
  playerAHomeGoals: number;
  playerAAwayGoals: number;
  playerBHomeGoals: number;
  playerBAwayGoals: number;
  matchHistory: Fixture[];
}

export interface GoalBreakdown {
  opponentId: string;
  opponentName: string;
  matchesPlayed: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface PlayerStats extends Standing {
  goalsPerMatch: number;
  winPercentage: number;
  drawPercentage: number;
  lossPercentage: number;
  homeRecord: { played: number; wins: number; draws: number; losses: number };
  awayRecord: { played: number; wins: number; draws: number; losses: number };
  biggestWin: Fixture | null;
  biggestDefeat: Fixture | null;
  highestScoringMatch: Fixture | null;
}
