export type Role = "ADMIN" | "PLAYER";
export type ProfileStatus = "ACTIVE" | "INACTIVE";
export type TournamentStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type FixtureStatus =
  | "SCHEDULED"
  | "RESULT_SUBMITTED"
  | "PENDING_ADMIN_APPROVAL"
  | "COMPLETED"
  | "POSTPONED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "RESERVED";
export type ResultType = "NORMAL" | "WALKOVER" | "OPPONENT_LEFT";
export type ResultStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface Profile {
  id: string;
  email: string;
  username: string;
  team_name: string | null;
  avatar_url: string | null;
  role: Role;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  organizer: string;
  status: TournamentStatus;
  start_date: string;
  end_date: string | null;
  current_matchweek: number;
  created_at: string;
  updated_at: string;
  player_count?: number;
}

export interface Fixture {
  id: string;
  tournament_id: string;
  matchweek: number;
  home_player_id: string;
  away_player_id: string;
  match_date: string;
  status: FixtureStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tournament?: Pick<Tournament, "id" | "name">;
  home_player?: Pick<Profile, "id" | "username" | "team_name" | "avatar_url">;
  away_player?: Pick<Profile, "id" | "username" | "team_name" | "avatar_url">;
}

export interface ResultSubmission {
  id: string;
  fixture_id: string;
  submitted_by: string;
  result_type: ResultType;
  home_actual_goals: number;
  away_actual_goals: number;
  home_bonus_goals: number;
  away_bonus_goals: number;
  home_table_score: number;
  away_table_score: number;
  status: ResultStatus;
  submitted_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  correction_reason: string | null;
}

export interface StandingRow {
  player_id: string;
  username: string;
  team_name: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  earned_points: number;
  penalty_adjustment: number;
  points: number;
  position: number;
}

export interface PlayerStatistics {
  player_id: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  actual_goals_scored: number;
  goals_conceded: number;
  goal_difference: number;
  goal_ratio: number | null;
  win_percentage: number;
  current_form: Array<"W" | "D" | "L">;
}

export interface GoalLeaderRow {
  player_id: string;
  username: string;
  matches: number;
  actual_goals: number;
  goals_per_match: number;
  rank: number;
}

export interface Viewer {
  userId: string;
  email: string;
  profile: Profile;
}

