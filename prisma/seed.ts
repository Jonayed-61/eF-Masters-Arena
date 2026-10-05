import { PrismaClient, Role, TournamentStatus, TournamentFormat, RegistrationStatus, PaymentStatus, MatchStatus, DisputeStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting eF Masters Arena seed...");

  // Clear existing database records cleanly
  await prisma.auditLog.deleteMany();
  await prisma.playerBan.deleteMany();
  await prisma.hallOfFame.deleteMany();
  await prisma.playerAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.disputeEvidence.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.matchSubmission.deleteMany();
  await prisma.match.deleteMany();
  await prisma.bracketNode.deleteMany();
  await prisma.standing.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.tournamentParticipant.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.tournamentRule.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.seasonRanking.deleteMany();
  await prisma.season.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.news.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);
  const playerPasswordHash = await bcrypt.hash("player123", 10);

  // 1. Create System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: "SITE_NAME", value: "eF Masters Arena", description: "Platform Title" },
      { key: "CURRENCY", value: "BDT", description: "Default currency symbol" },
      { key: "BKASH_NUMBER", value: "01700000000", description: "Official bKash Merchant/Personal number" },
      { key: "NAGAD_NUMBER", value: "01800000001", description: "Official Nagad Personal number" },
      { key: "ROCKET_NUMBER", value: "01900000002", description: "Official Rocket number" },
      { key: "WHATSAPP_COMMUNITY", value: "https://chat.whatsapp.com/efmasters", description: "Official WhatsApp group" },
      { key: "DISCORD_LINK", value: "https://discord.gg/efmasters", description: "Official Discord server" },
    ],
  });

  // 2. Create Achievements
  const ach1 = await prisma.achievement.create({
    data: {
      code: "FIRST_CHAMPION",
      title: "🏆 First Champion",
      description: "Crown yourself as champion of an official eF Masters tournament!",
      icon: "trophy",
      points: 100,
    },
  });

  const ach2 = await prisma.achievement.create({
    data: {
      code: "WIN_STREAK_5",
      title: "🔥 5 Consecutive Wins",
      description: "Achieve a unbroken streak of 5 match victories.",
      icon: "flame",
      points: 50,
    },
  });

  const ach3 = await prisma.achievement.create({
    data: {
      code: "TOURNAMENT_10",
      title: "⭐ Veteran Competitor",
      description: "Participate in 10 or more competitive matches.",
      icon: "star",
      points: 40,
    },
  });

  const ach4 = await prisma.achievement.create({
    data: {
      code: "THREE_TIME_CHAMP",
      title: "👑 Dynasty Legend",
      description: "Win 3 total tournament championships.",
      icon: "crown",
      points: 250,
    },
  });

  // 3. Create Users & Profiles
  // Super Admin
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@efmasters.com",
      passwordHash,
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      referralCode: "SUPERADMIN",
      profile: {
        create: {
          fullName: "Jonayed Admin",
          username: "superadmin",
          efootballId: "EF-999-001",
          efootballIgn: "eF_Admin_Boss",
          teamName: "Arena FC",
          whatsappNumber: "+8801711112222",
          country: "Bangladesh",
          bio: "Lead Administrator of eF Masters Arena platform.",
        },
      },
    },
  });

  // Tournament Admin
  const tAdminUser = await prisma.user.create({
    data: {
      email: "org@efmasters.com",
      passwordHash,
      role: Role.TOURNAMENT_ADMIN,
      emailVerified: true,
      referralCode: "TOURNAMENTADMIN",
      profile: {
        create: {
          fullName: "Tanvir Organizer",
          username: "tanvir_org",
          efootballId: "EF-888-002",
          efootballIgn: "eF_Organizer",
          teamName: "Organizers XI",
          whatsappNumber: "+8801811112222",
          country: "Bangladesh",
          bio: "Official eFootball Tournament Host & Referee.",
        },
      },
    },
  });

  // Moderator
  const modUser = await prisma.user.create({
    data: {
      email: "mod@efmasters.com",
      passwordHash,
      role: Role.MODERATOR,
      emailVerified: true,
      referralCode: "MODERATOR",
      profile: {
        create: {
          fullName: "Rahim Moderator",
          username: "rahim_mod",
          efootballId: "EF-777-003",
          efootballIgn: "eF_Ref_Rahim",
          teamName: "Referees FC",
          whatsappNumber: "+8801911112222",
          country: "Bangladesh",
          bio: "Fair Play & Disputes Committee Head.",
        },
      },
    },
  });

  // 16 Demo eFootball Players
  const playersData = [
    { name: "Jonayed Hossain", user: "jonayed", efId: "EF-101-999", ign: "Jonayed_eF", team: "Real Madrid eF", pts: 420, champ: 2, win: 18, draw: 3, loss: 2 },
    { name: "Tamim Ahmed", user: "tamim_ef", efId: "EF-102-888", ign: "Tamim_King", team: "FC Barcelona eF", pts: 350, champ: 1, win: 15, draw: 4, loss: 4 },
    { name: "Shakib Al Hasan", user: "shakib_99", efId: "EF-103-777", ign: "Shakib_Pro", team: "Bayern Munich eF", pts: 290, champ: 0, win: 12, draw: 5, loss: 5 },
    { name: "Messi Fanatic", user: "messi_king", efId: "EF-104-666", ign: "Leo_GOAT", team: "Inter Miami eF", pts: 260, champ: 0, win: 11, draw: 3, loss: 6 },
    { name: "CR7 Gamer", user: "cr7_goat", efId: "EF-105-555", ign: "Siuuu_Ronaldo", team: "Al Nassr eF", pts: 240, champ: 0, win: 10, draw: 2, loss: 7 },
    { name: "Neymar Skillz", user: "neymar_jr", efId: "EF-106-444", ign: "Neymar_Magic", team: "Santos eF", pts: 210, champ: 0, win: 9, draw: 4, loss: 8 },
    { name: "Haaland Beast", user: "haaland_beast", efId: "EF-107-333", ign: "Erling_Goal", team: "Man City eF", pts: 190, champ: 0, win: 8, draw: 3, loss: 9 },
    { name: "Mbappe Speed", user: "mbappe_speed", efId: "EF-108-222", ign: "Kylian_Fast", team: "PSG eF", pts: 175, champ: 0, win: 7, draw: 5, loss: 8 },
    { name: "KDB Master", user: "kdb_pass", efId: "EF-109-111", ign: "KDB_Vision", team: "Cityzens eF", pts: 150, champ: 0, win: 6, draw: 4, loss: 9 },
    { name: "Bellingham Star", user: "bellingham_5", efId: "EF-110-000", ign: "Jude_Hey", team: "Galacticos eF", pts: 140, champ: 0, win: 6, draw: 2, loss: 10 },
    { name: "Vinicius Jr", user: "vini_dribble", efId: "EF-111-123", ign: "Vini_Dance", team: "Flamengo eF", pts: 130, champ: 0, win: 5, draw: 4, loss: 10 },
    { name: "Pedri Vision", user: "pedri_magic", efId: "EF-112-234", ign: "Pedri_8", team: "Blaugrana eF", pts: 110, champ: 0, win: 4, draw: 3, loss: 11 },
    { name: "Salah King", user: "salah_egypt", efId: "EF-113-345", ign: "Mo_Salah_11", team: "Liverpool eF", pts: 95, champ: 0, win: 4, draw: 1, loss: 12 },
    { name: "Sonny Heung", user: "sonny_7", efId: "EF-114-456", ign: "Sonny_Strike", team: "Spurs eF", pts: 85, champ: 0, win: 3, draw: 2, loss: 13 },
    { name: "Modric Maestro", user: "modric_10", efId: "EF-115-567", ign: "Luka_Trivela", team: "Croatia eF", pts: 70, champ: 0, win: 2, draw: 4, loss: 12 },
    { name: "Yamal Wonder", user: "yamal_19", efId: "EF-116-678", ign: "Lamine_Star", team: "La Masia eF", pts: 60, champ: 0, win: 2, draw: 1, loss: 14 },
  ];

  const createdPlayers: Array<{ userId: string; username: string }> = [];

  for (const p of playersData) {
    const user = await prisma.user.create({
      data: {
        email: `${p.user}@efmasters.com`,
        passwordHash: playerPasswordHash,
        role: Role.PLAYER,
        emailVerified: true,
        referralCode: p.user.toUpperCase() + "2026",
        profile: {
          create: {
            fullName: p.name,
            username: p.user,
            efootballId: p.efId,
            efootballIgn: p.ign,
            teamName: p.team,
            whatsappNumber: `+8801700${Math.floor(100000 + Math.random() * 900000)}`,
            country: "Bangladesh",
            bio: `eFootball Mobile competitive player | ${p.team}`,
            rankingPoints: p.pts,
            matchesPlayed: p.win + p.draw + p.loss,
            matchesWon: p.win,
            matchesDrawn: p.draw,
            matchesLost: p.loss,
            goalsFor: p.win * 3 + p.draw,
            goalsAgainst: p.loss * 2 + p.draw,
            championships: p.champ,
          },
        },
      },
    });
    createdPlayers.push({ userId: user.id, username: p.user });

    // Grant first champion achievement if champ > 0
    if (p.champ > 0) {
      await prisma.playerAchievement.create({
        data: {
          userId: user.id,
          achievementId: ach1.id,
        },
      });
    }
  }

  // 4. Create Seasons
  const season4 = await prisma.season.create({
    data: {
      name: "eF Masters Season 4 (2026)",
      slug: "season-4-2026",
      description: "The flagship tournament season of 2026 featuring group stages, elimination brackets, and ৳5,000 in total prizes.",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-30"),
      isActive: true,
    },
  });

  const season3 = await prisma.season.create({
    data: {
      name: "eF Masters Season 3 (Summer Cup)",
      slug: "season-3-summer",
      description: "Summer 2026 Masters Cup championship.",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-08-31"),
      isActive: false,
    },
  });

  // 5. Create Tournaments
  // Tournament 1: Registration Open Paid Tournament
  const t1 = await prisma.tournament.create({
    data: {
      name: "eF Masters Season 4 Grand Championship",
      slug: "efootball-season-4-grand-championship",
      description: "Official Season 4 eFootball Mobile Grand Tournament. Compete against top esports mobile players for total ৳1,500 prize pool and global leaderboard ranking points!",
      banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200",
      game: "eFootball Mobile",
      platform: "Mobile (Android/iOS)",
      tournamentType: "Grand Cup",
      entryFee: 50,
      currency: "BDT",
      totalSlots: 32,
      registrationStart: new Date("2026-10-01"),
      registrationEnd: new Date("2026-10-15"),
      tournamentStart: new Date("2026-10-18"),
      prizePool: 1500,
      championPrize: 900,
      runnerUpPrize: 450,
      thirdPlacePrize: 150,
      format: TournamentFormat.GROUP_AND_KNOCKOUT,
      status: TournamentStatus.REGISTRATION_OPEN,
      organizer: "eF Masters Arena Official",
      createdById: adminUser.id,
      seasonId: season4.id,
      rules: {
        create: {
          teamType: "Dream Team",
          matchType: "Standard Match",
          matchTimeMinutes: 8,
          injuries: true,
          substitutions: 5,
          groupExtraTime: false,
          knockoutExtraTime: true,
          knockoutPenalty: true,
        },
      },
    },
  });

  // Register 12 players to t1 so remaining available slots = 20 (out of 32)!
  for (let i = 0; i < 12; i++) {
    const player = createdPlayers[i];
    const reg = await prisma.registration.create({
      data: {
        tournamentId: t1.id,
        userId: player.userId,
        status: RegistrationStatus.APPROVED,
        finalFee: 50,
      },
    });

    await prisma.payment.create({
      data: {
        registrationId: reg.id,
        userId: player.userId,
        method: i % 2 === 0 ? "bKash" : "Nagad",
        senderNumber: `01700${100000 + i}`,
        transactionId: `TRX9988${i + 100}`,
        amount: 50,
        status: PaymentStatus.APPROVED,
      },
    });

    await prisma.tournamentParticipant.create({
      data: {
        tournamentId: t1.id,
        userId: player.userId,
      },
    });
  }

  // Tournament 2: Ongoing Tournament with Groups and Matches
  const t2 = await prisma.tournament.create({
    data: {
      name: "eF Masters Season 4 Kickoff Cup",
      slug: "efootball-season-4-kickoff-cup",
      description: "Fast-paced 16-player tournament. Live group stages and knockout matches currently in progress.",
      banner: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200",
      entryFee: 0,
      currency: "BDT",
      totalSlots: 16,
      registrationStart: new Date("2026-09-20"),
      registrationEnd: new Date("2026-10-01"),
      tournamentStart: new Date("2026-10-02"),
      prizePool: 500,
      championPrize: 350,
      runnerUpPrize: 150,
      format: TournamentFormat.GROUP_AND_KNOCKOUT,
      status: TournamentStatus.ONGOING,
      organizer: "eF Masters Arena",
      createdById: adminUser.id,
      seasonId: season4.id,
      rules: {
        create: {
          teamType: "Dream Team",
          matchTimeMinutes: 8,
        },
      },
    },
  });

  // Add 16 participants for t2
  const t2Participants = [];
  for (let i = 0; i < 16; i++) {
    const player = createdPlayers[i];
    const reg = await prisma.registration.create({
      data: {
        tournamentId: t2.id,
        userId: player.userId,
        status: RegistrationStatus.APPROVED,
        finalFee: 0,
      },
    });

    const part = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: t2.id,
        userId: player.userId,
      },
    });
    t2Participants.push(part);
  }

  // Create Groups A, B, C, D for t2
  const groupNames = ["Group A", "Group B", "Group C", "Group D"];
  for (let gIdx = 0; gIdx < 4; gIdx++) {
    const group = await prisma.group.create({
      data: {
        tournamentId: t2.id,
        name: groupNames[gIdx],
        order: gIdx + 1,
      },
    });

    // 4 players per group
    for (let pIdx = 0; pIdx < 4; pIdx++) {
      const part = t2Participants[gIdx * 4 + pIdx];
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          participantId: part.id,
        },
      });

      // Create Standing
      const played = 3;
      const won = pIdx === 0 ? 3 : pIdx === 1 ? 2 : pIdx === 2 ? 1 : 0;
      const drawn = 0;
      const lost = 3 - won;
      const gf = won * 2 + 1;
      const ga = lost * 2;
      const pts = won * 3;

      await prisma.standing.create({
        data: {
          tournamentId: t2.id,
          groupId: group.id,
          userId: part.userId,
          position: pIdx + 1,
          played,
          won,
          drawn,
          lost,
          goalsFor: gf,
          goalsAgainst: ga,
          goalDiff: gf - ga,
          points: pts,
        },
      });
    }

    // Create Sample Matches for Group A
    if (gIdx === 0) {
      const p1 = t2Participants[0].userId;
      const p2 = t2Participants[1].userId;
      const p3 = t2Participants[2].userId;
      const p4 = t2Participants[3].userId;

      await prisma.match.create({
        data: {
          tournamentId: t2.id,
          groupId: group.id,
          roundName: "Group A - Match 1",
          roundNumber: 1,
          player1Id: p1,
          player2Id: p2,
          player1Score: 2,
          player2Score: 1,
          winnerId: p1,
          status: MatchStatus.CONFIRMED,
        },
      });

      await prisma.match.create({
        data: {
          tournamentId: t2.id,
          groupId: group.id,
          roundName: "Group A - Match 2",
          roundNumber: 1,
          player1Id: p3,
          player2Id: p4,
          player1Score: 3,
          player2Score: 0,
          winnerId: p3,
          status: MatchStatus.CONFIRMED,
        },
      });
    }
  }

  // Create Knockout Bracket for t2 (Quarter Final -> Semi Final -> Final)
  const finalBNode = await prisma.bracketNode.create({
    data: {
      tournamentId: t2.id,
      round: 3,
      stageName: "Final",
      position: 1,
    },
  });

  const finalBMatch = await prisma.match.create({
    data: {
      tournamentId: t2.id,
      roundName: "Final",
      roundNumber: 3,
      status: MatchStatus.SCHEDULED,
      scheduledTime: new Date(Date.now() + 48 * 3600 * 1000),
    },
  });
  await prisma.bracketNode.update({
    where: { id: finalBNode.id },
    data: { match: { connect: { id: finalBMatch.id } } },
  });

  const sf1BNode = await prisma.bracketNode.create({
    data: {
      tournamentId: t2.id,
      round: 2,
      stageName: "Semi Final 1",
      position: 1,
      nextMatchId: finalBNode.id,
    },
  });
  const sf1BMatch = await prisma.match.create({
    data: {
      tournamentId: t2.id,
      roundName: "Semi Final",
      roundNumber: 2,
      matchNumber: 1,
      status: MatchStatus.WAITING,
    },
  });
  await prisma.bracketNode.update({
    where: { id: sf1BNode.id },
    data: { match: { connect: { id: sf1BMatch.id } } },
  });

  const qf1BNode = await prisma.bracketNode.create({
    data: {
      tournamentId: t2.id,
      round: 1,
      stageName: "Quarter Final 1",
      position: 1,
      player1Id: createdPlayers[0].userId,
      player2Id: createdPlayers[3].userId,
      nextMatchId: sf1BNode.id,
    },
  });
  const qf1BMatch = await prisma.match.create({
    data: {
      tournamentId: t2.id,
      roundName: "Quarter Final",
      roundNumber: 1,
      matchNumber: 1,
      player1Id: createdPlayers[0].userId,
      player2Id: createdPlayers[3].userId,
      status: MatchStatus.SCHEDULED,
    },
  });
  await prisma.bracketNode.update({
    where: { id: qf1BNode.id },
    data: { match: { connect: { id: qf1BMatch.id } } },
  });

  // Tournament 3: Completed Tournament with Hall of Fame
  const t3 = await prisma.tournament.create({
    data: {
      name: "eF Masters Season 3 Elite Masters",
      slug: "efootball-season-3-elite-masters",
      description: "Completed Season 3 grand tournament. Champion Jonayed claimed the trophy!",
      banner: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200",
      entryFee: 100,
      currency: "BDT",
      totalSlots: 16,
      registrationStart: new Date("2026-06-01"),
      registrationEnd: new Date("2026-06-10"),
      tournamentStart: new Date("2026-06-12"),
      tournamentEnd: new Date("2026-06-25"),
      prizePool: 3000,
      championPrize: 2000,
      runnerUpPrize: 1000,
      format: TournamentFormat.GROUP_AND_KNOCKOUT,
      status: TournamentStatus.COMPLETED,
      organizer: "eF Masters Arena",
      createdById: adminUser.id,
      seasonId: season3.id,
      rules: {
        create: {
          teamType: "Dream Team",
        },
      },
      hallOfFame: {
        create: {
          championId: createdPlayers[0].userId,
          runnerUpId: createdPlayers[1].userId,
          thirdPlaceId: createdPlayers[2].userId,
          dateCompleted: new Date("2026-06-25"),
          prizePool: 3000,
        },
      },
    },
  });

  // Tournament 4: Upcoming Tournament
  await prisma.tournament.create({
    data: {
      name: "eF Masters Season 5 Winter Invitational",
      slug: "efootball-season-5-winter-invitational",
      description: "Upcoming winter championship. Registration opens Nov 1, 2026.",
      banner: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200",
      entryFee: 100,
      currency: "BDT",
      totalSlots: 64,
      registrationStart: new Date("2026-11-01"),
      registrationEnd: new Date("2026-11-15"),
      tournamentStart: new Date("2026-11-20"),
      prizePool: 5000,
      championPrize: 3000,
      runnerUpPrize: 1500,
      thirdPlacePrize: 500,
      format: TournamentFormat.GROUP_AND_KNOCKOUT,
      status: TournamentStatus.UPCOMING,
      organizer: "eF Masters Arena",
      createdById: adminUser.id,
    },
  });

  // 6. Create Coupons
  await prisma.coupon.create({
    data: {
      code: "SEASON4",
      discountType: "PERCENTAGE",
      discountVal: 20,
      maxUses: 100,
    },
  });

  await prisma.coupon.create({
    data: {
      code: "WELCOME50",
      discountType: "FIXED",
      discountVal: 25,
      maxUses: 50,
    },
  });

  // 7. Create Announcements & News
  await prisma.announcement.create({
    data: {
      tournamentId: t1.id,
      title: "🔥 Season 4 Grand Championship Registration Open!",
      content: "Slots are filling fast! Register now with bKash or Nagad to secure your slot.",
      isGlobal: true,
    },
  });

  await prisma.announcement.create({
    data: {
      tournamentId: t2.id,
      title: "⚽ Kickoff Cup Group Stage Live!",
      content: "Group A and B matches are active. Submit your match screenshots promptly.",
      isGlobal: false,
    },
  });

  await prisma.news.create({
    data: {
      title: "eF Masters Arena Season 4 Launched with ৳5,000 Prize Pool",
      slug: "ef-masters-season-4-launched",
      summary: "The ultimate eFootball Mobile tournament platform launches Season 4 featuring live standings, automated brackets, and global rankings.",
      content: "Welcome to eF Masters Arena! We are thrilled to announce Season 4 of our mobile competitive platform...",
      author: "eF Masters Editorial",
    },
  });

  console.log("eF Masters Arena seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
