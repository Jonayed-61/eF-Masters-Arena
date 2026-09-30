import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const allowed = new Set(["JIHAN_FC7","SATanbir1","Hie_senberg","feroz__2","MAHI05","Ontikboss","kzkm234","Ariyan10_Vk","Tonmoy2022","Rifat061","Abir_Talukdar"]);
const file = process.argv.find((value) => value.startsWith("--file="))?.slice(7);
if (!file) throw new Error("Pass a secure credential JSON path as --file=PATH.");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server environment variables are required.");
const records = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(records)) throw new Error("Credential JSON must be an array.");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: tournament, error: tournamentError } = await supabase.from("tournaments").select("id").eq("name", "eF Masters Pro League 0").single();
if (tournamentError) throw tournamentError;

for (const record of records) {
  if (!allowed.has(record.username)) throw new Error(`Unexpected username: ${record.username}`);
  if (typeof record.email !== "string" || !record.email.includes("@") || typeof record.password !== "string" || record.password.length < 10) throw new Error(`Real email and a 10+ character password are required for ${record.username}.`);
  const { data, error } = await supabase.auth.admin.createUser({ email: record.email.trim().toLowerCase(), password: record.password, email_confirm: true, user_metadata: { username: record.username, role: "PLAYER" } });
  if (error) throw new Error(`${record.username}: ${error.message}`);
  const { error: profileError } = await supabase.from("profiles").update({ team_name: record.teamName || null, status: "ACTIVE" }).eq("id", data.user.id);
  if (profileError) throw profileError;
  const { error: participantError } = await supabase.from("tournament_players").insert({ tournament_id: tournament.id, player_id: data.user.id, status: "ACTIVE" });
  if (participantError) throw participantError;
  console.log(`Provisioned ${record.username}`);
}
