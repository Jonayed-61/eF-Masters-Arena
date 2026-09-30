import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(".env.local");

const TOURNAMENT_NAME = "eF Masters Pro League 0";
const ORGANIZER = "eF Masters Arena";
const PLAYER_USERNAMES = [
  "JIHAN_FC7",
  "SATanbir1",
  "Hie_senberg",
  "feroz__2",
  "MAHI05",
  "Ontikboss",
  "kzkm234",
  "Ariyan10_Vk",
  "Tonmoy2022",
  "Rifat061",
  "Abir_Talukdar",
];

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) throw new Error("Supabase server environment variables are required.");

const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const activationDate = new Date().toISOString().slice(0, 10);

async function detectSchema() {
  const modern = await supabase.from("tournaments").select("id").limit(1);
  if (!modern.error) return "modern";
  if (!["42P01", "PGRST205"].includes(modern.error.code)) throw modern.error;
  const legacy = await supabase.from("seasons").select("id").limit(1);
  if (legacy.error) throw legacy.error;
  return "legacy";
}

async function inspectProfiles() {
  const { data, error } = await supabase.from("profiles").select("id,username,role,status").in("username", PLAYER_USERNAMES);
  if (error) throw error;
  const exact = (data ?? []).filter((profile) => PLAYER_USERNAMES.includes(profile.username));
  const found = new Map(exact.map((profile) => [profile.username, profile]));
  return {
    profiles: exact,
    missing: PLAYER_USERNAMES.filter((username) => !found.has(username)),
  };
}

async function inspectModern() {
  const { data: tournaments, error } = await supabase.from("tournaments").select("*").eq("name", TOURNAMENT_NAME);
  if (error) throw error;
  const tournament = tournaments?.[0] ?? null;
  if (!tournament) return { tournament: null, duplicates: 0, memberships: 0, fixtures: 0, results: 0 };
  const [memberships, fixtures, results] = await Promise.all([
    supabase.from("tournament_players").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
    supabase.from("fixtures").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
    supabase.from("result_submissions").select("id,fixtures!inner(tournament_id)", { count: "exact", head: true }).eq("fixtures.tournament_id", tournament.id),
  ]);
  for (const response of [memberships, fixtures, results]) if (response.error) throw response.error;
  return { tournament, duplicates: Math.max(0, (tournaments?.length ?? 1) - 1), memberships: memberships.count ?? 0, fixtures: fixtures.count ?? 0, results: results.count ?? 0 };
}

async function inspectLegacy() {
  const { data: seasons, error } = await supabase.from("seasons").select("*").eq("name", TOURNAMENT_NAME);
  if (error) throw error;
  const tournament = seasons?.[0] ?? null;
  if (!tournament) return { tournament: null, duplicates: 0, memberships: 0, fixtures: 0, results: 0 };
  const [memberships, fixtures, results] = await Promise.all([
    supabase.from("season_players").select("user_id", { count: "exact", head: true }).eq("season_id", tournament.id),
    supabase.from("fixtures").select("id", { count: "exact", head: true }).eq("season_id", tournament.id),
    supabase.from("fixtures").select("id", { count: "exact", head: true }).eq("season_id", tournament.id).in("approval_status", ["pending", "approved", "corrected"]),
  ]);
  for (const response of [memberships, fixtures, results]) if (response.error) throw response.error;
  return { tournament, duplicates: Math.max(0, (seasons?.length ?? 1) - 1), memberships: memberships.count ?? 0, fixtures: fixtures.count ?? 0, results: results.count ?? 0 };
}

async function configureModern(existing, profiles) {
  let tournament = existing;
  if (tournament) {
    const { data, error } = await supabase.from("tournaments").update({
      organizer: ORGANIZER,
      status: "ACTIVE",
      start_date: tournament.start_date ?? activationDate,
    }).eq("id", tournament.id).select("*").single();
    if (error) throw error;
    tournament = data;
  } else {
    const { data, error } = await supabase.from("tournaments").insert({
      name: TOURNAMENT_NAME,
      organizer: ORGANIZER,
      status: "ACTIVE",
      start_date: activationDate,
      end_date: null,
      current_matchweek: 0,
    }).select("*").single();
    if (error) throw error;
    tournament = data;
  }
  if (profiles.length) {
    const memberships = profiles.map((profile) => ({ tournament_id: tournament.id, player_id: profile.id, status: "ACTIVE" }));
    const { error } = await supabase.from("tournament_players").upsert(memberships, { onConflict: "tournament_id,player_id" });
    if (error) throw error;
  }
  return tournament;
}

async function configureLegacy(existing, profiles) {
  let tournament = existing;
  if (tournament) {
    const { data, error } = await supabase.from("seasons").update({
      organizer: ORGANIZER,
      status: "active",
      start_date: tournament.start_date ?? activationDate,
    }).eq("id", tournament.id).select("*").single();
    if (error) throw error;
    tournament = data;
  } else {
    const { data, error } = await supabase.from("seasons").insert({
      name: TOURNAMENT_NAME,
      organizer: ORGANIZER,
      status: "active",
      start_date: activationDate,
      end_date: null,
      current_matchweek: 1,
    }).select("*").single();
    if (error) throw error;
    tournament = data;
  }
  if (profiles.length) {
    const memberships = profiles.map((profile) => ({ season_id: tournament.id, user_id: profile.id }));
    const { error } = await supabase.from("season_players").upsert(memberships, { onConflict: "season_id,user_id" });
    if (error) throw error;
  }
  return tournament;
}

function printSummary({ schema, inspection, profileInspection, after, mode }) {
  console.log(`Mode: ${mode}`);
  console.log(`Schema: ${schema}`);
  console.log(`Tournament: ${TOURNAMENT_NAME}`);
  console.log(`Tournament records: ${inspection.tournament ? 1 + inspection.duplicates : 0}`);
  console.log(`Current status: ${after?.tournament?.status ?? inspection.tournament?.status ?? "NOT CREATED"}`);
  console.log(`Organizer: ${after?.tournament?.organizer ?? inspection.tournament?.organizer ?? ORGANIZER}`);
  console.log(`Start date: ${after?.tournament?.start_date ?? inspection.tournament?.start_date ?? "NOT SET"}`);
  console.log(`Current matchweek: ${after?.tournament?.current_matchweek ?? inspection.tournament?.current_matchweek ?? "NOT SET"}`);
  console.log(`Profiles found: ${profileInspection.profiles.length}`);
  console.log(`Participants assigned: ${after?.memberships ?? inspection.memberships}`);
  console.log(`Missing Players: ${profileInspection.missing.length ? profileInspection.missing.join(", ") : "0"}`);
  console.log(`Fixtures in database: ${after?.fixtures ?? inspection.fixtures}`);
  console.log(`Result records in database: ${after?.results ?? inspection.results}`);
  console.log("Fixtures created by this script: 0");
  console.log("Results created by this script: 0");
  console.log("Fixture mode: Manual");
}

const schema = await detectSchema();
const profileInspection = await inspectProfiles();
const inspection = schema === "modern" ? await inspectModern() : await inspectLegacy();

if (inspection.duplicates > 0) throw new Error(`Duplicate tournament records detected: ${inspection.duplicates + 1}. Resolve them before setup.`);
if (dryRun) {
  printSummary({ schema, inspection, profileInspection, mode: "DRY RUN — no writes" });
  process.exit(0);
}

if (schema === "modern") await configureModern(inspection.tournament, profileInspection.profiles);
else await configureLegacy(inspection.tournament, profileInspection.profiles);

const after = schema === "modern" ? await inspectModern() : await inspectLegacy();
printSummary({ schema, inspection, profileInspection, after, mode: "APPLIED" });
if (profileInspection.missing.length) process.exitCode = 2;
