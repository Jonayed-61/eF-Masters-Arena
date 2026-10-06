import { Role } from "@prisma/client";

export function getDashboardCapabilities(role: Role) {
  return {
    playerWorkspace: role === Role.PLAYER,
    moderation: role === Role.SUPER_ADMIN || role === Role.TOURNAMENT_ADMIN || role === Role.MODERATOR,
    tournamentManagement: role === Role.SUPER_ADMIN || role === Role.TOURNAMENT_ADMIN,
    platformManagement: role === Role.SUPER_ADMIN,
  };
}
