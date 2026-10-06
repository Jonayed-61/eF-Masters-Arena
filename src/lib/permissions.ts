import { Role } from "@prisma/client";
import { AppError } from "./api-response";
import { getCurrentUser } from "./auth";
import { db } from "./db";

export function canManageOwnedTournament(actor: { id: string; role: Role }, ownerId: string) {
  return actor.role === Role.SUPER_ADMIN || (actor.role === Role.TOURNAMENT_ADMIN && actor.id === ownerId);
}

export function canModerateTournament(actor: { id: string; role: Role }, ownerId: string) {
  return actor.role === Role.SUPER_ADMIN || actor.role === Role.MODERATOR || (actor.role === Role.TOURNAMENT_ADMIN && actor.id === ownerId);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Authentication is required.", 401);
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AppError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  return user;
}

export function requireAdmin() {
  return requireRole(Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN, Role.MODERATOR);
}

export async function requireTournamentOwnerOrSuperAdmin(tournamentId: string) {
  const user = await requireRole(Role.SUPER_ADMIN, Role.TOURNAMENT_ADMIN);
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { createdById: true } });
  if (!tournament) throw new AppError("TOURNAMENT_NOT_FOUND", "Tournament not found.", 404);
  if (!canManageOwnedTournament(user, tournament.createdById)) throw new AppError("FORBIDDEN", "You cannot manage another administrator's tournament.", 403);
  return user;
}

export async function requireTournamentModerator(tournamentId: string) {
  const user = await requireAdmin();
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, select: { createdById: true } });
  if (!tournament) throw new AppError("TOURNAMENT_NOT_FOUND", "Tournament not found.", 404);
  if (!canModerateTournament(user, tournament.createdById)) throw new AppError("FORBIDDEN", "You cannot moderate another administrator's tournament.", 403);
  return user;
}

