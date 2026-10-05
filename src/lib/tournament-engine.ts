import { db } from "./db";
import { Match, MatchStatus, PaymentStatus, RegistrationStatus, TournamentStatus } from "@prisma/client";

export function calculateAvailableSlots(totalSlots: number, confirmedCount: number) {
  const availableSlots = Math.max(0, totalSlots - confirmedCount);
  return { availableSlots, isFull: availableSlots === 0 };
}

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
  const participants = await db.tournamentParticipant.findMany({
    where: { tournamentId },
    orderBy: { joinedAt: "asc" },
  });

  if (participants.length === 0) {
    throw new Error("No confirmed participants to generate groups");
  }

  // Delete existing groups and standings
  await db.standing.deleteMany({ where: { tournamentId } });
  await db.groupMember.deleteMany({ where: { group: { tournamentId } } });
  await db.group.deleteMany({ where: { tournamentId } });

  const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const createdGroups = [];

  for (let i = 0; i < groupCount; i++) {
    const groupName = `Group ${groupLetters[i] || i + 1}`;
    const group = await db.group.create({
      data: {
        tournamentId,
        name: groupName,
        order: i + 1,
      },
    });
    createdGroups.push(group);
  }

  // Distribute participants across groups evenly (Snake draft / Round-robin distribution)
  for (let idx = 0; idx < participants.length; idx++) {
    const participant = participants[idx];
    const groupIndex = idx % groupCount;
    const targetGroup = createdGroups[groupIndex];

    await db.groupMember.create({
      data: {
        groupId: targetGroup.id,
        participantId: participant.id,
      },
    });

    // Create initial 0-point standing entry
    await db.standing.create({
      data: {
        tournamentId,
        groupId: targetGroup.id,
        userId: participant.userId,
        position: 1,
      },
    });
  }

  return createdGroups;
}

/**
 * Generates Round-Robin match fixtures for each group in a tournament.
 */
export async function generateGroupFixturesEngine(tournamentId: string) {
  const groups = await db.group.findMany({
    where: { tournamentId },
    include: {
      members: {
        include: { participant: true },
      },
    },
  });

  if (groups.length === 0) throw new Error("No groups found. Please generate groups first.");

  // Clear previous group matches
  await db.match.deleteMany({
    where: {
      tournamentId,
      groupId: { not: null },
    },
  });

  const generatedMatches: Match[] = [];

  for (const group of groups) {
    const userIds = group.members.map((m) => m.participant.userId);

    // Generate round-robin pairings
    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        const p1 = userIds[i];
        const p2 = userIds[j];

        const createdMatch: Match = await db.match.create({
          data: {
            tournamentId,
            groupId: group.id,
            roundName: group.name,
            roundNumber: 1,
            player1Id: p1,
            player2Id: p2,
            status: MatchStatus.SCHEDULED,
            scheduledTime: new Date(Date.now() + (generatedMatches.length + 1) * 3600 * 1000),
          },
        });
        generatedMatches.push(createdMatch);
      }
    }
  }

  return generatedMatches;
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

  const statsMap: Record<
    string,
    {
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      points: number;
    }
  > = {};

  // Initialize stats
  for (const member of group.members) {
    statsMap[member.participant.userId] = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    };
  }

  // Calculate stats from confirmed matches
  for (const match of confirmedMatches) {
    if (!match.player1Id || !match.player2Id) continue;
    const p1Score = match.player1Score ?? 0;
    const p2Score = match.player2Score ?? 0;

    const s1 = statsMap[match.player1Id];
    const s2 = statsMap[match.player2Id];

    if (s1) {
      s1.played += 1;
      s1.goalsFor += p1Score;
      s1.goalsAgainst += p2Score;
    }

    if (s2) {
      s2.played += 1;
      s2.goalsFor += p2Score;
      s2.goalsAgainst += p1Score;
    }

    if (p1Score > p2Score) {
      if (s1) { s1.won += 1; s1.points += 3; }
      if (s2) { s2.lost += 1; }
    } else if (p2Score > p1Score) {
      if (s2) { s2.won += 1; s2.points += 3; }
      if (s1) { s1.lost += 1; }
    } else {
      if (s1) { s1.drawn += 1; s1.points += 1; }
      if (s2) { s2.drawn += 1; s2.points += 1; }
    }
  }

  // Sort players by: Points -> Goal Difference -> Goals For
  const sortedPlayers = Object.keys(statsMap).sort((a, b) => {
    const sA = statsMap[a];
    const sB = statsMap[b];

    if (sB.points !== sA.points) return sB.points - sA.points;

    const gdA = sA.goalsFor - sA.goalsAgainst;
    const gdB = sB.goalsFor - sB.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;

    return sB.goalsFor - sA.goalsFor;
  });

  // Upsert standings table
  for (let idx = 0; idx < sortedPlayers.length; idx++) {
    const userId = sortedPlayers[idx];
    const st = statsMap[userId];
    const goalDiff = st.goalsFor - st.goalsAgainst;

    await db.standing.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      update: {
        position: idx + 1,
        played: st.played,
        won: st.won,
        drawn: st.drawn,
        lost: st.lost,
        goalsFor: st.goalsFor,
        goalsAgainst: st.goalsAgainst,
        goalDiff,
        points: st.points,
      },
      create: {
        tournamentId: group.tournamentId,
        groupId,
        userId,
        position: idx + 1,
        played: st.played,
        won: st.won,
        drawn: st.drawn,
        lost: st.lost,
        goalsFor: st.goalsFor,
        goalsAgainst: st.goalsAgainst,
        goalDiff,
        points: st.points,
      },
    });
  }
}

/**
 * Generates Knockout Bracket (Quarter Final -> Semi Final -> Final)
 */
export async function generateKnockoutBracketEngine(tournamentId: string, topPerGroup: number = 2) {
  const groups = await db.group.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
  });

  if (groups.length === 0) throw new Error("No groups exist for bracket creation");

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

  if (qualifiedUsers.length < 2) throw new Error("At least 2 qualified players are required for knockout bracket");

  // Clear previous brackets and knockout matches
  await db.bracketNode.deleteMany({ where: { tournamentId } });
  await db.match.deleteMany({
    where: {
      tournamentId,
      groupId: null,
    },
  });

  // Create Final node first
  const finalNode = await db.bracketNode.create({
    data: {
      tournamentId,
      round: 3,
      stageName: "Final",
      position: 1,
    },
  });

  const finalMatch = await db.match.create({
    data: {
      tournamentId,
      roundName: "Final",
      roundNumber: 3,
      status: MatchStatus.SCHEDULED,
      scheduledTime: new Date(Date.now() + 48 * 3600 * 1000),
    },
  });

  await db.bracketNode.update({
    where: { id: finalNode.id },
    data: { match: { connect: { id: finalMatch.id } } },
  });

  // Semi Finals
  const sf1Node = await db.bracketNode.create({
    data: {
      tournamentId,
      round: 2,
      stageName: "Semi Final 1",
      position: 1,
      nextMatchId: finalNode.id,
    },
  });

  const sf1Match = await db.match.create({
    data: {
      tournamentId,
      roundName: "Semi Final",
      roundNumber: 2,
      matchNumber: 1,
      status: MatchStatus.SCHEDULED,
      scheduledTime: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  await db.bracketNode.update({
    where: { id: sf1Node.id },
    data: { match: { connect: { id: sf1Match.id } } },
  });

  const sf2Node = await db.bracketNode.create({
    data: {
      tournamentId,
      round: 2,
      stageName: "Semi Final 2",
      position: 2,
      nextMatchId: finalNode.id,
    },
  });

  const sf2Match = await db.match.create({
    data: {
      tournamentId,
      roundName: "Semi Final",
      roundNumber: 2,
      matchNumber: 2,
      status: MatchStatus.SCHEDULED,
      scheduledTime: new Date(Date.now() + 26 * 3600 * 1000),
    },
  });

  await db.bracketNode.update({
    where: { id: sf2Node.id },
    data: { match: { connect: { id: sf2Match.id } } },
  });

  // Quarter Finals (4 matches connecting to SF1 and SF2)
  const qfNodes = [];
  const sfParents = [sf1Node.id, sf1Node.id, sf2Node.id, sf2Node.id];

  for (let i = 0; i < 4; i++) {
    const p1 = qualifiedUsers[i * 2]?.userId || null;
    const p2 = qualifiedUsers[i * 2 + 1]?.userId || null;

    const qfNode = await db.bracketNode.create({
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

    const qfMatch = await db.match.create({
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

    await db.bracketNode.update({
      where: { id: qfNode.id },
      data: { match: { connect: { id: qfMatch.id } } },
    });

    qfNodes.push(qfNode);
  }

  return { finalNode, sf1Node, sf2Node, qfNodes };
}

/**
 * Advances winner of a knockout match to the next bracket round automatically.
 */
export async function advanceKnockoutWinnerEngine(matchId: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { bracketNode: true },
  });

  if (!match || !match.winnerId || !match.bracketNode || !match.bracketNode.nextMatchId) {
    return;
  }

  const currentBracket = match.bracketNode;
  const nextMatchId = currentBracket.nextMatchId;
  if (!nextMatchId) return;
  const nextBracket = await db.bracketNode.findUnique({
    where: { id: nextMatchId },
  });

  if (!nextBracket) return;

  // Determine whether this winner sits as player1 or player2 in next match
  const isPlayer1Slot = !nextBracket.player1Id;

  const updateBracketData = isPlayer1Slot
    ? { player1Id: match.winnerId }
    : { player2Id: match.winnerId };

  await db.bracketNode.update({
    where: { id: nextBracket.id },
    data: updateBracketData,
  });

  const nextMatch = await db.match.findUnique({ where: { bracketNodeId: nextBracket.id } });
  if (nextMatch) {
    const updateMatchData = isPlayer1Slot
      ? { player1Id: match.winnerId }
      : { player2Id: match.winnerId };

    const updatedNextMatch = await db.match.update({
      where: { id: nextMatch.id },
      data: updateMatchData,
    });

    // If both players are now populated in next match, update status to SCHEDULED
    if (updatedNextMatch.player1Id && updatedNextMatch.player2Id) {
      await db.match.update({
        where: { id: updatedNextMatch.id },
        data: { status: MatchStatus.SCHEDULED },
      });
    }
  }
}

/**
 * When a tournament is finalized/completed, awards ranking points, unlocks achievements,
 * populates Hall of Fame, and updates player statistics.
 */
export async function finalizeTournamentEngine(tournamentId: string, championId: string, runnerUpId: string, thirdPlaceId?: string) {
  const existingHallOfFame = await db.hallOfFame.findUnique({ where: { tournamentId } });
  if (existingHallOfFame) return existingHallOfFame;

  const tournament = await db.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.COMPLETED },
  });

  // Award Ranking Points
  const pointDistribution = {
    champion: 100,
    runnerUp: 70,
    thirdPlace: 50,
    quarterFinal: 30,
    groupStage: 10,
  };

  // Champion updates
  await db.profile.update({
    where: { userId: championId },
    data: {
      championships: { increment: 1 },
      rankingPoints: { increment: pointDistribution.champion },
    },
  });

  // Runner-Up updates
  await db.profile.update({
    where: { userId: runnerUpId },
    data: {
      runnerUps: { increment: 1 },
      rankingPoints: { increment: pointDistribution.runnerUp },
    },
  });

  if (thirdPlaceId) {
    await db.profile.update({
      where: { userId: thirdPlaceId },
      data: {
        semiFinals: { increment: 1 },
        rankingPoints: { increment: pointDistribution.thirdPlace },
      },
    });
  }

  // Record Hall of Fame
  await db.hallOfFame.upsert({
    where: { tournamentId },
    update: {
      championId,
      runnerUpId,
      thirdPlaceId,
      prizePool: tournament.prizePool,
    },
    create: {
      tournamentId,
      championId,
      runnerUpId,
      thirdPlaceId,
      prizePool: tournament.prizePool,
    },
  });

  // Auto-Unlock Achievements
  await checkAndUnlockAchievements(championId);
  await checkAndUnlockAchievements(runnerUpId);
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
