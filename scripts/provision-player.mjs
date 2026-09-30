import { createClient } from "@supabase/supabase-js";

const allowed = new Set(["JIHAN_FC7","SATanbir1","Hie_senberg","feroz__2","MAHI05","Ontikboss","kzkm234","Ariyan10_Vk","Tonmoy2022","Rifat061","Abir_Talukdar"]);
const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "INITIAL_PLAYER_EMAIL", "INITIAL_PLAYER_USERNAME", "INITIAL_PLAYER_PASSWORD"];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required.`);

const email = process.env.INITIAL_PLAYER_EMAIL.trim().toLowerCase();
const username = process.env.INITIAL_PLAYER_USERNAME.trim();
const password = process.env.INITIAL_PLAYER_PASSWORD;
if (!allowed.has(username)) throw new Error("INITIAL_PLAYER_USERNAME must be one of the supplied competition usernames.");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INITIAL_PLAYER_EMAIL must be valid.");
if (password.length < 10) throw new Error("INITIAL_PLAYER_PASSWORD must have at least 10 characters.");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: existingProfile, error: profileLookupError } = await supabase.from("profiles").select("id,email,username,role,status").ilike("username", username).maybeSingle();
if (profileLookupError) throw profileLookupError;

let user;
if (existingProfile) {
  const { data, error } = await supabase.auth.admin.updateUserById(existingProfile.id, {
    password,
    email_confirm: true,
    user_metadata: { username, role: "PLAYER" },
  });
  if (error) throw error;
  user = data.user;
} else {
  let page = 1;
  let existingAuth;
  do {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    existingAuth = data.users.find((item) => item.email?.toLowerCase() === email);
    if (existingAuth || data.users.length < 200) break;
    page += 1;
  } while (!existingAuth);
  if (existingAuth) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingAuth.id, { password, email_confirm: true, user_metadata: { username, role: "PLAYER" } });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username, full_name: username, role: "PLAYER" } });
    if (error) throw error;
    user = data.user;
  }
}

let { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? email, username, role: "PLAYER", status: "ACTIVE" }, { onConflict: "id" });
if (profileError?.code === "22P02") {
  const legacy = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? email, username, full_name: username, role: "player", status: "active" }, { onConflict: "id" });
  profileError = legacy.error;
}
if (profileError) throw profileError;

const currentName = "eF Masters Pro League 0";
const tournamentResult = await supabase.from("tournaments").select("id").eq("name", currentName).maybeSingle();
if (!tournamentResult.error && tournamentResult.data) {
  const { error } = await supabase.from("tournament_players").upsert({ tournament_id: tournamentResult.data.id, player_id: user.id, status: "ACTIVE" }, { onConflict: "tournament_id,player_id" });
  if (error) throw error;
} else if (["42P01", "PGRST205"].includes(tournamentResult.error?.code) || !tournamentResult.data) {
  const { data: season, error: seasonError } = await supabase.from("seasons").select("id").eq("name", currentName).single();
  if (seasonError) throw seasonError;
  const { error } = await supabase.from("season_players").upsert({ season_id: season.id, user_id: user.id }, { onConflict: "season_id,user_id" });
  if (error) throw error;
} else {
  throw tournamentResult.error;
}

console.log(`Player active: ${username} (${user.id})`);
