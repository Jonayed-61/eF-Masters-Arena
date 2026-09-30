import type { Fixture, Player } from "./types";

export const SEASON = { id: "season-0", name: "eF Masters Pro League 0", organizer: "eF Masters Arena", currentMatchweek: 5 };

export const demoPlayers: Player[] = [
  { id: "tonmoy", name: "Tonmoy Hasan", username: "tonmoy", teamName: "Barcelona", gamePlayerId: "EF-001", active: true },
  { id: "rahim", name: "Rahim Ahmed", username: "rahim", teamName: "Real Madrid", gamePlayerId: "EF-002", active: true },
  { id: "hasan", name: "Hasan Mahmud", username: "hasan", teamName: "Arsenal", gamePlayerId: "EF-003", active: true },
  { id: "karim", name: "Karim Hossain", username: "karim", teamName: "Bayern Munich", gamePlayerId: "EF-004", active: true },
  { id: "sakib", name: "Sakib Khan", username: "sakib", teamName: "Manchester City", gamePlayerId: "EF-005", active: true },
  { id: "fahim", name: "Fahim Islam", username: "fahim", teamName: "Liverpool", gamePlayerId: "EF-006", active: true },
];

export const demoFixtures: Fixture[] = [
  { id: "f1", seasonId: SEASON.id, matchweek: 1, homeUserId: "tonmoy", awayUserId: "rahim", matchDate: "2026-09-04", matchTime: "21:00", homeScore: 3, awayScore: 1, status: "completed", approvalStatus: "approved" },
  { id: "f2", seasonId: SEASON.id, matchweek: 1, homeUserId: "hasan", awayUserId: "karim", matchDate: "2026-09-05", matchTime: "22:00", homeScore: 2, awayScore: 2, status: "completed", approvalStatus: "approved" },
  { id: "f3", seasonId: SEASON.id, matchweek: 1, homeUserId: "sakib", awayUserId: "fahim", matchDate: "2026-09-06", matchTime: "21:30", homeScore: 1, awayScore: 2, status: "completed", approvalStatus: "approved" },
  { id: "f4", seasonId: SEASON.id, matchweek: 2, homeUserId: "karim", awayUserId: "tonmoy", matchDate: "2026-09-10", matchTime: "21:00", homeScore: 2, awayScore: 4, status: "completed", approvalStatus: "approved" },
  { id: "f5", seasonId: SEASON.id, matchweek: 2, homeUserId: "rahim", awayUserId: "sakib", matchDate: "2026-09-11", matchTime: "22:00", homeScore: 3, awayScore: 0, status: "completed", approvalStatus: "approved" },
  { id: "f6", seasonId: SEASON.id, matchweek: 2, homeUserId: "fahim", awayUserId: "hasan", matchDate: "2026-09-12", matchTime: "21:30", homeScore: 1, awayScore: 1, status: "completed", approvalStatus: "approved" },
  { id: "f7", seasonId: SEASON.id, matchweek: 3, homeUserId: "tonmoy", awayUserId: "sakib", matchDate: "2026-09-17", matchTime: "21:00", homeScore: 5, awayScore: 2, status: "completed", approvalStatus: "approved" },
  { id: "f8", seasonId: SEASON.id, matchweek: 3, homeUserId: "hasan", awayUserId: "rahim", matchDate: "2026-09-18", matchTime: "22:00", homeScore: 2, awayScore: 3, status: "completed", approvalStatus: "approved" },
  { id: "f9", seasonId: SEASON.id, matchweek: 3, homeUserId: "karim", awayUserId: "fahim", matchDate: "2026-09-19", matchTime: "21:30", homeScore: 1, awayScore: 0, status: "completed", approvalStatus: "approved" },
  { id: "f10", seasonId: SEASON.id, matchweek: 4, homeUserId: "fahim", awayUserId: "tonmoy", matchDate: "2026-09-24", matchTime: "21:00", homeScore: 2, awayScore: 2, status: "completed", approvalStatus: "approved" },
  { id: "f11", seasonId: SEASON.id, matchweek: 4, homeUserId: "rahim", awayUserId: "karim", matchDate: "2026-09-25", matchTime: "22:00", homeScore: 4, awayScore: 1, status: "pending_approval", approvalStatus: "pending", submittedBy: "rahim", submittedAt: "2026-09-25T16:15:00Z", opponentConfirmation: "confirmed" },
  { id: "f12", seasonId: SEASON.id, matchweek: 4, homeUserId: "sakib", awayUserId: "hasan", matchDate: "2026-09-26", matchTime: "21:30", homeScore: 1, awayScore: 3, status: "pending_approval", approvalStatus: "pending", submittedBy: "hasan", submittedAt: "2026-09-26T16:30:00Z", opponentConfirmation: "pending" },
  { id: "f13", seasonId: SEASON.id, matchweek: 5, homeUserId: "tonmoy", awayUserId: "hasan", matchDate: "2026-10-02", matchTime: "21:00", homeScore: null, awayScore: null, status: "upcoming", approvalStatus: "none" },
  { id: "f14", seasonId: SEASON.id, matchweek: 5, homeUserId: "karim", awayUserId: "sakib", matchDate: "2026-10-03", matchTime: "22:00", homeScore: null, awayScore: null, status: "upcoming", approvalStatus: "none" },
  { id: "f15", seasonId: SEASON.id, matchweek: 5, homeUserId: "rahim", awayUserId: "fahim", matchDate: "2026-10-04", matchTime: "21:30", homeScore: null, awayScore: null, status: "upcoming", approvalStatus: "none" },
];

export const getPlayer = (id: string) => demoPlayers.find((player) => player.id === id)!;
