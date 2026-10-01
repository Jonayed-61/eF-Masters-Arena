import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(".env.local");

const TOURNAMENT_NAME = "eF Masters Pro League 0";
const ORGANIZER = "eF Masters Arena";
const RESERVE_DATES = ["2026-10-11", "2026-10-19"];
const PLAYER_USERNAMES = [
  "JIHAN_FC7", "SATanbir1", "Hie_senberg", "feroz__2", "MAHI05", "Ontikboss",
  "kzkm234", "Ariyan10_Vk", "Tonmoy2022", "Rifat061", "Abir_Talukdar",
];

const rounds = [
  [1, "2026-09-30", [["JIHAN_FC7", "kzkm234"], ["Hie_senberg", "Ariyan10_Vk"], ["Ontikboss", "Abir_Talukdar"], ["Tonmoy2022", "SATanbir1"], ["Rifat061", "feroz__2"]]],
  [2, "2026-10-01", [["Ariyan10_Vk", "MAHI05"], ["Abir_Talukdar", "JIHAN_FC7"], ["SATanbir1", "Hie_senberg"], ["feroz__2", "Ontikboss"], ["Rifat061", "Tonmoy2022"]]],
  [3, "2026-10-02", [["kzkm234", "Abir_Talukdar"], ["MAHI05", "SATanbir1"], ["JIHAN_FC7", "feroz__2"], ["Hie_senberg", "Rifat061"], ["Ontikboss", "Tonmoy2022"]]],
  [4, "2026-10-03", [["SATanbir1", "Ariyan10_Vk"], ["feroz__2", "kzkm234"], ["Rifat061", "MAHI05"], ["Tonmoy2022", "JIHAN_FC7"], ["Ontikboss", "Hie_senberg"]]],
  [5, "2026-10-04", [["Abir_Talukdar", "feroz__2"], ["Ariyan10_Vk", "Rifat061"], ["kzkm234", "Tonmoy2022"], ["MAHI05", "Ontikboss"], ["JIHAN_FC7", "Hie_senberg"]]],
  [6, "2026-10-05", [["Rifat061", "SATanbir1"], ["Tonmoy2022", "Abir_Talukdar"], ["Ontikboss", "Ariyan10_Vk"], ["Hie_senberg", "kzkm234"], ["JIHAN_FC7", "MAHI05"]]],
  [7, "2026-10-06", [["feroz__2", "Tonmoy2022"], ["SATanbir1", "Ontikboss"], ["Abir_Talukdar", "Hie_senberg"], ["Ariyan10_Vk", "JIHAN_FC7"], ["kzkm234", "MAHI05"]]],
  [8, "2026-10-07", [["Ontikboss", "Rifat061"], ["Hie_senberg", "feroz__2"], ["JIHAN_FC7", "SATanbir1"], ["MAHI05", "Abir_Talukdar"], ["kzkm234", "Ariyan10_Vk"]]],
  [9, "2026-10-08", [["Tonmoy2022", "Hie_senberg"], ["feroz__2", "MAHI05"], ["Rifat061", "JIHAN_FC7"], ["SATanbir1", "kzkm234"], ["Abir_Talukdar", "Ariyan10_Vk"]]],
  [10, "2026-10-09", [["JIHAN_FC7", "Ontikboss"], ["MAHI05", "Tonmoy2022"], ["kzkm234", "Rifat061"], ["Ariyan10_Vk", "feroz__2"], ["Abir_Talukdar", "SATanbir1"]]],
  [11, "2026-10-10", [["Hie_senberg", "MAHI05"], ["Ontikboss", "kzkm234"], ["Tonmoy2022", "Ariyan10_Vk"], ["Rifat061", "Abir_Talukdar"], ["feroz__2", "SATanbir1"]]],
  [12, "2026-10-12", [["kzkm234", "JIHAN_FC7"], ["Ariyan10_Vk", "Hie_senberg"], ["Abir_Talukdar", "Ontikboss"], ["SATanbir1", "Tonmoy2022"], ["feroz__2", "Rifat061"]]],
  [13, "2026-10-13", [["MAHI05", "Ariyan10_Vk"], ["JIHAN_FC7", "Abir_Talukdar"], ["Hie_senberg", "SATanbir1"], ["Ontikboss", "feroz__2"], ["Tonmoy2022", "Rifat061"]]],
  [14, "2026-10-14", [["Abir_Talukdar", "kzkm234"], ["SATanbir1", "MAHI05"], ["feroz__2", "JIHAN_FC7"], ["Rifat061", "Hie_senberg"], ["Tonmoy2022", "Ontikboss"]]],
  [15, "2026-10-15", [["Ariyan10_Vk", "SATanbir1"], ["kzkm234", "feroz__2"], ["MAHI05", "Rifat061"], ["JIHAN_FC7", "Tonmoy2022"], ["Hie_senberg", "Ontikboss"]]],
  [16, "2026-10-16", [["feroz__2", "Abir_Talukdar"], ["Rifat061", "Ariyan10_Vk"], ["Tonmoy2022", "kzkm234"], ["Ontikboss", "MAHI05"], ["Hie_senberg", "JIHAN_FC7"]]],
  [17, "2026-10-17", [["SATanbir1", "Rifat061"], ["Abir_Talukdar", "Tonmoy2022"], ["Ariyan10_Vk", "Ontikboss"], ["kzkm234", "Hie_senberg"], ["MAHI05", "JIHAN_FC7"]]],
  [18, "2026-10-18", [["Tonmoy2022", "feroz__2"], ["Ontikboss", "SATanbir1"], ["Hie_senberg", "Abir_Talukdar"], ["JIHAN_FC7", "Ariyan10_Vk"], ["MAHI05", "kzkm234"]]],
  [19, "2026-10-20", [["Rifat061", "Ontikboss"], ["feroz__2", "Hie_senberg"], ["SATanbir1", "JIHAN_FC7"], ["Abir_Talukdar", "MAHI05"], ["Ariyan10_Vk", "kzkm234"]]],
  [20, "2026-10-21", [["Hie_senberg", "Tonmoy2022"], ["MAHI05", "feroz__2"], ["JIHAN_FC7", "Rifat061"], ["kzkm234", "SATanbir1"], ["Ariyan10_Vk", "Abir_Talukdar"]]],
  [21, "2026-10-22", [["Ontikboss", "JIHAN_FC7"], ["Tonmoy2022", "MAHI05"], ["Rifat061", "kzkm234"], ["feroz__2", "Ariyan10_Vk"], ["SATanbir1", "Abir_Talukdar"]]],
  [22, "2026-10-23", [["MAHI05", "Hie_senberg"], ["kzkm234", "Ontikboss"], ["Ariyan10_Vk", "Tonmoy2022"], ["Abir_Talukdar", "Rifat061"], ["SATanbir1", "feroz__2"]]],
];

function fail(message) { throw new Error(message); }
function fixtureIdentity(fixture) {
  return [fixture.matchweek, fixture.home_player_id, fixture.away_player_id, fixture.match_date].join("|");
}

function validateSchedule() {
  if (rounds.length !== 22) fail(`Schedule has ${rounds.length} rounds; expected 22.`);
  const fixtures = rounds.flatMap(([round, date, matches]) => {
    if (matches.length !== 5) fail(`Round ${round} has ${matches.length} fixtures; expected 5.`);
    if (RESERVE_DATES.includes(date)) fail(`Round ${round} incorrectly uses Reserve Day ${date}.`);
    if (new Set(matches.flat()).size !== 10) fail(`Round ${round} must contain 10 distinct players.`);
    return matches.map(([home, away]) => ({ round, date, home, away }));
  });
  if (fixtures.length !== 110) fail(`Schedule has ${fixtures.length} fixtures; expected 110.`);

  const known = new Set(PLAYER_USERNAMES);
  const directed = new Map();
  const pairs = new Map();
  for (const fixture of fixtures) {
    if (!known.has(fixture.home) || !known.has(fixture.away)) fail(`Unknown player in Round ${fixture.round}.`);
    if (fixture.home === fixture.away) fail(`Self-fixture found in Round ${fixture.round}.`);
    const directedKey = `${fixture.home}|${fixture.away}`;
    const pairKey = [fixture.home, fixture.away].sort().join("|");
    directed.set(directedKey, (directed.get(directedKey) ?? 0) + 1);
    pairs.set(pairKey, (pairs.get(pairKey) ?? 0) + 1);
  }
  if (pairs.size !== 55) fail(`Schedule has ${pairs.size} player pairs; expected 55.`);
  for (const [pair, count] of pairs) {
    const [a, b] = pair.split("|");
    if (count !== 2 || directed.get(`${a}|${b}`) !== 1 || directed.get(`${b}|${a}`) !== 1) fail(`Home/Away validation failed for ${a} and ${b}.`);
  }
  return fixtures;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) fail("Supabase server environment variables are required in .env.local.");
const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const schedule = validateSchedule();

const { data: tournaments, error: tournamentError } = await supabase.from("tournaments").select("*").eq("name", TOURNAMENT_NAME);
if (tournamentError) throw tournamentError;
if (tournaments.length !== 1) fail(`Expected exactly one ${TOURNAMENT_NAME} tournament; found ${tournaments.length}.`);
const tournament = tournaments[0];
if (tournament.status !== "ACTIVE") fail(`Tournament status is ${tournament.status}; expected ACTIVE.`);
if (tournament.organizer !== ORGANIZER) fail(`Tournament organizer is ${tournament.organizer}; expected ${ORGANIZER}.`);

const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,username").in("username", PLAYER_USERNAMES);
if (profileError) throw profileError;
const profileByUsername = new Map((profiles ?? []).filter((profile) => PLAYER_USERNAMES.includes(profile.username)).map((profile) => [profile.username, profile]));
const missingPlayers = PLAYER_USERNAMES.filter((username) => !profileByUsername.has(username));
if (missingPlayers.length) fail(`Missing exact Player profiles: ${missingPlayers.join(", ")}. No fixtures were inserted.`);

const playerIds = PLAYER_USERNAMES.map((username) => profileByUsername.get(username).id);
const { data: memberships, error: membershipError } = await supabase.from("tournament_players").select("player_id,status").eq("tournament_id", tournament.id).in("player_id", playerIds);
if (membershipError) throw membershipError;
const activeMemberIds = new Set((memberships ?? []).filter((row) => row.status === "ACTIVE").map((row) => row.player_id));
const missingMemberships = PLAYER_USERNAMES.filter((username) => !activeMemberIds.has(profileByUsername.get(username).id));
if (missingMemberships.length) fail(`Players missing active tournament membership: ${missingMemberships.join(", ")}. No fixtures were inserted.`);

const [fixtureResponse, reserveResponse, resultResponse] = await Promise.all([
  supabase.from("fixtures").select("id,matchweek,home_player_id,away_player_id,match_date,status").eq("tournament_id", tournament.id),
  supabase.from("reserve_days").select("id,reserve_date,active,max_matches_per_player").eq("tournament_id", tournament.id),
  supabase.from("result_submissions").select("id,fixtures!inner(tournament_id)", { count: "exact", head: true }).eq("fixtures.tournament_id", tournament.id),
]);
for (const response of [fixtureResponse, reserveResponse, resultResponse]) if (response.error) throw response.error;
if ((resultResponse.count ?? 0) !== 0) fail(`Tournament already has ${resultResponse.count} result records; expected 0. No fixtures were inserted.`);

const desired = schedule.map((fixture) => ({
  tournament_id: tournament.id,
  matchweek: fixture.round,
  home_player_id: profileByUsername.get(fixture.home).id,
  away_player_id: profileByUsername.get(fixture.away).id,
  match_date: fixture.date,
  status: "SCHEDULED",
  notes: null,
}));
const desiredIdentities = new Set(desired.map(fixtureIdentity));
const existingFixtures = fixtureResponse.data ?? [];
const unexpected = existingFixtures.filter((fixture) => !desiredIdentities.has(fixtureIdentity(fixture)));
if (unexpected.length) fail(`Found ${unexpected.length} existing fixture(s) outside the authoritative schedule. No fixtures were inserted.`);
const unexpectedReserveDays = (reserveResponse.data ?? []).filter((day) => !RESERVE_DATES.includes(day.reserve_date));
if (unexpectedReserveDays.length) fail(`Found unexpected Reserve Days: ${unexpectedReserveDays.map((day) => day.reserve_date).join(", ")}. No fixtures were inserted.`);

const existingIdentities = new Set(existingFixtures.map(fixtureIdentity));
const missingFixtures = desired.filter((fixture) => !existingIdentities.has(fixtureIdentity(fixture)));
const { error: reserveError } = await supabase.from("reserve_days").upsert(
  RESERVE_DATES.map((reserve_date) => ({ tournament_id: tournament.id, reserve_date, active: true, max_matches_per_player: 2 })),
  { onConflict: "tournament_id,reserve_date" },
);
if (reserveError) throw reserveError;
if (missingFixtures.length) {
  const { error: insertError } = await supabase.from("fixtures").insert(missingFixtures);
  if (insertError) throw insertError;
}

const [finalFixtureResponse, finalReserveResponse, finalResultResponse] = await Promise.all([
  supabase.from("fixtures").select("id,matchweek,home_player_id,away_player_id,match_date,status").eq("tournament_id", tournament.id),
  supabase.from("reserve_days").select("reserve_date,active,max_matches_per_player").eq("tournament_id", tournament.id).order("reserve_date"),
  supabase.from("result_submissions").select("id,fixtures!inner(tournament_id)", { count: "exact", head: true }).eq("fixtures.tournament_id", tournament.id),
]);
for (const response of [finalFixtureResponse, finalReserveResponse, finalResultResponse]) if (response.error) throw response.error;
const finalFixtures = finalFixtureResponse.data ?? [];
const finalIdentities = new Set(finalFixtures.map(fixtureIdentity));
const representedRounds = new Set(finalFixtures.map((fixture) => fixture.matchweek));
const finalReserveDays = finalReserveResponse.data ?? [];
if (finalFixtures.length !== 110 || finalIdentities.size !== 110 || [...desiredIdentities].some((identity) => !finalIdentities.has(identity))) fail("Final fixture verification failed.");
if (representedRounds.size !== 22 || [...representedRounds].some((round) => round < 1 || round > 22)) fail("Final Round verification failed.");
if (finalReserveDays.length !== 2 || finalReserveDays.some((day) => !RESERVE_DATES.includes(day.reserve_date) || !day.active || day.max_matches_per_player !== 2)) fail("Final Reserve Day verification failed.");
if ((finalResultResponse.count ?? 0) !== 0) fail("Final result verification failed: result records exist.");

console.log(`Tournament: ${TOURNAMENT_NAME}`);
console.log("Status: Ongoing / Active");
console.log(`Players resolved: ${profileByUsername.size}`);
console.log("Participants: 11");
console.log("Rounds: 22");
console.log("Fixtures expected: 110");
console.log(`Fixtures inserted: ${missingFixtures.length}`);
console.log(`Fixtures skipped: ${110 - missingFixtures.length}`);
console.log(`Total fixtures: ${finalFixtures.length}`);
console.log("Reserve Days: 2");
console.log(`Reserve Day 1: ${RESERVE_DATES[0]}`);
console.log(`Reserve Day 2: ${RESERVE_DATES[1]}`);
console.log("Fixture Mode: Manual");
console.log("Results: 0");
console.log("No results inserted.");
