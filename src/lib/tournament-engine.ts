import { db } from "./db";
import { Match, MatchStatus, Prisma, RegistrationStatus, TournamentStatus } from "@prisma/client";
import { AppError } from "./api-response";
import { calculateAvailableSlots, calculateStandings, createRoundRobinPairs } from "./tournament/calculations";

export { calculateAvailableSlots } from "./tournament/calculations";

/**
 * Calculates remaining slots for a tournament.
 * Prevents overbooking race conditions by counting approved registrations.
 */
export async function getTournamentSlotStatus(tournamentId: string) {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { totalSlots: true, status: true },
  });

  if (!tournament) throw new Error("Tournament not found");

  const confirmedCount = await db.registration.count({
    where: {
      tournamentId,
      status: RegistrationStatus.APPROVED,
    },
  });

  const { availableSlots, isFull } = calculateAvailableSlots(tournament.totalSlots, confirmedCount);

  return {
    totalSlots: tournament.totalSlots,
    confirmedSlots: confirmedCount,
    availableSlots,
    isFull,
    status: tournament.status,
  };
}

/**
 * Generates group assignments for confirmed tournament participants.
 */
export async function generateGroupsEngine(tournamentId: string, groupCount: number = 4) {
  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > 8) throw new AppError("INVALID_GROUP_COUNT", "Group count must be between 1 and 8.", 400);
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId }, include: { groups: { orderBy: { order: "asc" } } } });
  if (!tournament) throw new AppError("TOURNAMENT_NOT_FOUND", "Tournament not found.", 404);
  if (tournament.groups.length > 0) return tournament.groups;
  if (!new Set<TournamentStatus>([TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.GROUP_STAGE, TournamentStatus.ONGOING]).has(tournament.status)) {
    throw new AppError("INVALID_TOURNAMENT_PHASE", "Close registration before generating groups.", 409);
  }
  const approved = await db.registration.findMany({ where: { tournamentId, status: RegistrationStatus.APPROVED }, orderBy: { createdAt: "asc" }, select: { userId: true } });
  if (approved.length < tournament.minimumParticipants) throw new AppError("NOT_ENOUGH_PARTICIPANTS", `At least ${tournament.minimumParticipants} approved participants are required.`, 409);
  if (groupCount > approved.length) throw new AppError("TOO_MANY_GROUPS", "Group count cannot exceed the participant count.", 409);

  return db.$transaction(async (tx) => {
    const participants = [];
    for (const registration of approved) {
      participants.push(await tx.tournamentParticipant.upsert({ where: { tournamentId_userId: { tournamentId, userId: registration.userId } }, update: {}, create: { tournamentId, userId: registration.userId } }));
    }
    const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const createdGroups = [];
    for (let index = 0; index < groupCount; index += 1) {
      createdGroups.push(await tx.group.create({ data: { tournamentId, name: `Group ${groupLetters[index]}`, order: index + 1 } }));
    }
    for (let index = 0; index < participants.length; index += 1) {
      const participant = participants[index];
      const targetGroup = createdGroups[index % groupCount];
      await tx.groupMember.create({ data: { groupId: targetGroup.id, participantId: participant.id } });
      await tx.standing.create({ data: { tournamentId, groupId: targetGroup.id, userId: participant.userId, position: 1 } });
      await tx.notification.create({ data: { userId: participant.userId, title: "Group assigned", message: `You were assigned to ${targetGroup.name} in ${tournament.name}.`, link: `/tournaments/${tournament.slug}` } });
    }
    await tx.tournament.update({ where: { id: tournamentId }, data: { status: TournamentStatus.GROUP_STAGE, groupCount } });
    return createdGroups;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Generates Round-Robin match fixtures for each group in a tournament.
 */
export async function generateGroupFixturesEngine(tournamentId: string) {
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new AppError("TOURNAMENT_NOT_FOUND", "Tournament not found.", 404);
  if (!new Set<TournamentStatus>([TournamentStatus.GROUP_STAGE, TournamentStatus.ONGOING]).has(tournament.status)) throw new AppError("INVALID_TOURNAMENT_PHASE", "Group fixtures can only be generated during the group stage.", 409);
  const groups = await db.group.findMany({
    where: { tournamentId },
    include: {
      members: {
        include: { participant: true },
      },
    },
  });

  if (groups.length === 0) throw new AppError("GROUPS_NOT_FOUND", "Generate groups before fixtures.", 409);
  const existing = await db.match.findMany({ where: { tournamentId, groupId: { not: null } }, orderBy: [{ groupId: "asc" }, { matchNumber: "asc" }] });
  if (existing.length > 0) return existing;
  return db.$transaction(async (tx) => {
    const generatedMatches: Match[] = [];
    for (const group of groups) {
      const pairs = createRoundRobinPairs(group.members.map((member) => member.participant.userId));
      for (let index = 0; index < pairs.length; index += 1) {
        const [player1Id, player2Id] = pairs[index];
        generatedMatches.push(await tx.match.create({ data: { tournamentId, groupId: group.id, roundName: group.name, roundNumber: 1, matchNumber: index + 1, player1Id, player2Id, status: MatchStatus.SCHEDULED } }));
      }
    }
    return generatedMatches;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Recalculates group standings dynamically from confirmed match results.
 * Standard Tie-Breakers: Points > Goal Difference > Goals For > Head-to-Head
 */
export async function updateGroupStandings(groupId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { participant: true },
      },
    },
  });

  if (!group) return;

  const confirmedMatches = await db.match.findMany({
    where: {
      groupId,
      status: MatchStatus.CONFIRMED,
    },
  });

  const standings = calculateStandings(
    group.members.map((member) => member.participant.userId),
    confirmedMatches.flatMap((match) => match.player1Id && match.player2Id && match.player1Score !== null && match.player2Score !== null ? [{ player1Id: match.player1Id, player2Id: match.player2Id, player1Score: match.player1Score, player2Score: match.player2Score }] : []),
  );
  await db.$transaction(standings.map((standing) => db.standing.upsert({
      where: {
        groupId_userId: { groupId, userId: standing.userId },
      },
      update: {
        position: standing.position, played: standing.played, won: standing.won, drawn: standing.drawn, lost: standing.lost,
        goalsFor: standing.goalsFor, goalsAgainst: standing.goalsAgainst, goalDiff: standing.goalDiff, points: standing.points,
      },
      create: {
        tournamentId: group.tournamentId, groupId, userId: standing.userId, position: standing.position,
        played: standing.played, won: standing.won, drawn: standing.drawn, lost: standing.lost,
        goalsFor: standing.goalsFor, goalsAgainst: standing.goalsAgainst, goalDiff: standing.goalDiff, points: standing.points,
      },
    })));
  return standings;
}

/**
 * Generates Knockout Bracket (Quarter Final -> Semi Final -> Final)
 */
export async function generateKnockoutBracketEngine(tournamentId: string, topPerGroup: number = 2) {
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new AppError("TOURNAMENT_NOT_FOUND", "Tournament not found.", 404);
  if (!new Set<TournamentStatus>([TournamentStatus.GROUP_STAGE, TournamentStatus.ONGOING, TournamentStatus.KNOCKOUT_STAGE]).has(tournament.status)) {
    throw new AppError("INVALID_TOURNAMENT_PHASE", "The knockout bracket can only be generated after the group stage.", 409);
  }
  const existingNodes = await db.bracketNode.findMany({ where: { tournamentId }, include: { match: true }, orderBy: [{ round: "asc" }, { position: "asc" }] });
  if (existingNodes.length > 0) return { existing: true, nodes: existingNodes };
  if (!Number.isInteger(topPerGroup) || topPerGroup < 1 || topPerGroup > 4) throw new AppError("INVALID_QUALIFIER_COUNT", "Qualifiers per group must be between 1 and 4.", 400);
  const groups = await db.group.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
  });

  if (groups.length === 0) throw new AppError("GROUPS_NOT_FOUND", "No groups exist for bracket creation.", 409);
  const groupMatchCount = await db.match.count({ where: { tournamentId, groupId: { not: null } } });
  const unresolvedGroupMatches = await db.match.count({ where: { tournamentId, groupId: { not: null }, status: { not: MatchStatus.CONFIRMED } } });
  if (groupMatchCount === 0 || unresolvedGroupMatches > 0) throw new AppError("GROUP_STAGE_INCOMPLETE", "Every group match must be verified before generating the knockout bracket.", 409);

  const qualifiedUsers: { userId: string; groupName: string; pos: number }[] = [];

  for (const g of groups) {
    const topStandings = await db.standing.findMany({
      where: { groupId: g.id },
      orderBy: { position: "asc" },
      take: topPerGroup,
    });
    topStandings.forEach((st) => {
      qualifiedUsers.push({ userId: st.userId, groupName: g.name, pos: st.position });
    });
  }

  const uniqueQualifierIds = new Set(qualifiedUsers.map((qualifier) => qualifier.userId));
  if (qualifiedUsers.length !== 8 || uniqueQualifierIds.size !== 8) throw new AppError("UNSUPPORTED_BRACKET_SIZE", "This tournament engine currently requires exactly eight unique knockout qualifiers.", 409);

  return db.$transaction(async (tx) => {

  // Create Final node first
  const finalNode = await tx.bracketNode.create({
    data: {
      tournamentId,
      round: 3,
      stageName: "Final",
      position: 1,
    },
  });

  const finalMatch = await tx.match.create({
    data: {
      tournamentId,
      roundName: "Final",
      roundNumber: 3,
      status: MatchStatus.SCHEDULED,
      scheduledTime: new Date(Date.now() + 48 * 3600 * 1000),
    },
  });

  await tx.bracketNode.update({
    where: { id: finalNode.id },
    data: { match: { connect: { id: finalMatch.id } } },
  });

  // Semi Finals
  const sf1Node = await tx.bracketNode.create({
    data: {
      tournamentId,
      round: 2,
      stageName: "Semi Final 1",
      position: 1,
      nextMatchId: finalNode.id,
    },
  });

  const sf1Match = await tx.match.create({
    data: {
      tournamentId,
      roundName: "Semi Final",
      roundNumber: 2,
      matchNumber: 1,
      status: MatchStatus.SCHEDULED,
      scheduledTime: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  await tx.bracketNode.update({
    where: { id: sf1Node.id },
    data: { match: { connect: { id: sf1Match.id } } },
  });

  const sf2Node = await tx.bracketNode.create({
    data: {
      tournamentId,
      round: 2,
      stageName: "Semi Final 2",
      position: 2,
      nextMatchId: finalNode.id,
    },
  });

  const sf2Match = await tx.match.create({
    data: {
      tournamentId,
      roundName: "Semi Final",
      roundNumber: 2,
      matchNumber: 2,
      status: MatchStatus.SCHEDULED,
      scheduledTime: new Date(Date.now() + 26 * 3600 * 1000),
    },
  });

  await tx.bracketNode.update({
    where: { id: sf2Node.id },
    data: { match: { connect: { id: sf2Match.id } } },
  });

  // Quarter Finals (4 matches connecting to SF1 and SF2)
  const qfNodes = [];
  const sfParents = [sf1Node.id, sf1Node.id, sf2Node.id, sf2Node.id];

  for (let i = 0; i < 4; i++) {
    const p1 = qualifiedUsers[i * 2]?.userId || null;
    const p2 = qualifiedUsers[i * 2 + 1]?.userId || null;

    const qfNode = await tx.bracketNode.create({
      data: {
        tournamentId,
        round: 1,
        stageName: `Quarter Final ${i + 1}`,
        position: i + 1,
        player1Id: p1,
        player2Id: p2,
        nextMatchId: sfParents[i],
      },
    });

    const qfMatch = await tx.match.create({
      data: {
        tournamentId,
        roundName: "Quarter Final",
        roundNumber: 1,
        matchNumber: i + 1,
        player1Id: p1,
        player2Id: p2,
        status: p1 && p2 ? MatchStatus.SCHEDULED : MatchStatus.WAITING,
        scheduledTime: new Date(Date.now() + 12 * 3600 * 1000),
      },
    });

    await tx.bracketNode.update({
      where: { id: qfNode.id },
      data: { match: { connect: { id: qfMatch.id } } },
    });

    qfNodes.push(qfNode);
  }

  await tx.tournament.update({ where: { id: tournamentId }, data: { status: TournamentStatus.KNOCKOUT_STAGE, qualifiersPerGroup: topPerGroup } });
  return { existing: false, finalNode, sf1Node, sf2Node, qfNodes };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Advances winner of a knockout match to the next bracket round automatically.
 */
export async function advanceKnockoutWinnerEngine(matchId: string) {
  await db.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId }, include: { bracketNode: true } });
    if (!match || match.status !== MatchStatus.CONFIRMED || !match.winnerId || !match.bracketNode) return;
    await tx.bracketNode.update({ where: { id: match.bracketNode.id }, data: { winnerId: match.winnerId } });
    if (!match.bracketNode.nextMatchId) return;
    const nextBracket = await tx.bracketNode.findUnique({ where: { id: match.bracketNode.nextMatchId } });
    if (!nextBracket) return;
    if (nextBracket.player1Id === match.winnerId || nextBracket.player2Id === match.winnerId) return;
    if (nextBracket.player1Id && nextBracket.player2Id) throw new AppError("BRACKET_SLOT_CONFLICT", "The next bracket match is already full.", 409);
    const usePlayerOne = !nextBracket.player1Id;
    const bracketData = usePlayerOne ? { player1Id: match.winnerId } : { player2Id: match.winnerId };
    await tx.bracketNode.update({ where: { id: nextBracket.id }, data: bracketData });
    const nextMatch = await tx.match.findUnique({ where: { bracketNodeId: nextBracket.id } });
    if (!nextMatch) return;
    const updated = await tx.match.update({ where: { id: nextMatch.id }, data: bracketData });
    if (updated.player1Id && updated.player2Id && updated.status === MatchStatus.WAITING) {
      await tx.match.update({ where: { id: updated.id }, data: { status: MatchStatus.SCHEDULED } });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * When a tournament is finalized/completed, awards ranking points, unlocks achievements,
 * populates Hall of Fame, and updates player statistics.
 */
export async function finalizeTournamentEngine(tournamentId: string, championId: string, runnerUpId: string, thirdPlaceId?: string) {
  if (championId === runnerUpId || championId === thirdPlaceId || runnerUpId === thirdPlaceId) throw new AppError("INVALID_PODIUM", "Podium players must be unique.", 409);
  const existingHallOfFame = await db.hallOfFame.findUnique({ where: { tournamentId } });
  if (existingHallOfFame) return existingHallOfFame;
  const pointDistribution = {
    champion: 100,
    runnerUp: 70,
    thirdPlace: 50,
  };
  const hallOfFame = await db.$transaction(async (tx) => {
    const currentHall = await tx.hallOfFame.findUnique({ where: { tournamentId } });
    if (currentHall) return currentHall;
    const tournament = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
    if (!new Set<TournamentStatus>([TournamentStatus.KNOCKOUT_STAGE, TournamentStatus.ONGOING]).has(tournament.status)) throw new AppError("INVALID_TOURNAMENT_PHASE", "Only a tournament in its knockout stage can be completed.", 409);
    const podiumIds = [championId, runnerUpId, ...(thirdPlaceId ? [thirdPlaceId] : [])];
    const approvedPodiumCount = await tx.registration.count({ where: { tournamentId, userId: { in: podiumIds }, status: RegistrationStatus.APPROVED } });
    if (approvedPodiumCount !== podiumIds.length) throw new AppError("INVALID_PODIUM", "Every podium player must be an approved tournament participant.", 409);
    const created = await tx.hallOfFame.create({ data: { tournamentId, championId, runnerUpId, thirdPlaceId, prizePool: tournament.prizePool } });
    await tx.profile.update({ where: { userId: championId }, data: { championships: { increment: 1 }, rankingPoints: { increment: pointDistribution.champion } } });
    await tx.profile.update({ where: { userId: runnerUpId }, data: { runnerUps: { increment: 1 }, rankingPoints: { increment: pointDistribution.runnerUp } } });
    if (thirdPlaceId) await tx.profile.update({ where: { userId: thirdPlaceId }, data: { semiFinals: { increment: 1 }, rankingPoints: { increment: pointDistribution.thirdPlace } } });
    await tx.tournament.update({ where: { id: tournamentId }, data: { status: TournamentStatus.COMPLETED } });
    await tx.notification.createMany({ data: [
      { userId: championId, title: "Tournament champion", message: `You won ${tournament.name}.`, link: `/tournaments/${tournament.slug}` },
      { userId: runnerUpId, title: "Tournament completed", message: `You finished runner-up in ${tournament.name}.`, link: `/tournaments/${tournament.slug}` },
    ] });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await checkAndUnlockAchievements(championId);
  await checkAndUnlockAchievements(runnerUpId);
  if (thirdPlaceId) await checkAndUnlockAchievements(thirdPlaceId);
  return hallOfFame;
}

/**
 * Checks condition triggers and awards achievements to players automatically.
 */
export async function checkAndUnlockAchievements(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) return;

  const userAchievements = await db.playerAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const existingIds = new Set(userAchievements.map((a) => a.achievementId));

  const allAchievements = await db.achievement.findMany();

  for (const ach of allAchievements) {
    if (existingIds.has(ach.id)) continue;

    let unlocked = false;
    if (ach.code === "FIRST_CHAMPION" && profile.championships >= 1) unlocked = true;
    if (ach.code === "THREE_TIME_CHAMP" && profile.championships >= 3) unlocked = true;
    if (ach.code === "WIN_STREAK_5" && profile.matchesWon >= 5) unlocked = true;
    if (ach.code === "TOURNAMENT_10" && profile.matchesPlayed >= 10) unlocked = true;

    if (unlocked) {
      await db.playerAchievement.create({
        data: {
          userId,
          achievementId: ach.id,
        },
      });

      // Send notification to player
      await db.notification.create({
        data: {
          userId,
          title: `🏆 Achievement Unlocked: ${ach.title}`,
          message: `Congratulations! You unlocked "${ach.title}" - ${ach.description}`,
          link: `/players/${profile.username}`,
        },
      });
    }
  }
}
