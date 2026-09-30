import { createClient } from "@supabase/supabase-js";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "INITIAL_ADMIN_EMAIL", "INITIAL_ADMIN_USERNAME", "INITIAL_ADMIN_PASSWORD"];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required.`);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
const username = process.env.INITIAL_ADMIN_USERNAME.trim();
if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) throw new Error("INITIAL_ADMIN_USERNAME must use 3–32 letters, numbers, or underscores.");
if (process.env.INITIAL_ADMIN_PASSWORD.length < 10) throw new Error("INITIAL_ADMIN_PASSWORD must have at least 10 characters.");

let page = 1;
let existing;
do {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  existing = data.users.find((user) => user.email?.toLowerCase() === email);
  if (existing || data.users.length < 200) break;
  page += 1;
} while (!existing);

let user;
if (existing) {
  const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
    password: process.env.INITIAL_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { ...existing.user_metadata, username, role: "ADMIN" },
  });
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: process.env.INITIAL_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { username, role: "ADMIN" },
  });
  if (error) throw error;
  user = data.user;
}

let { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  email,
  username,
  role: "ADMIN",
  status: "ACTIVE",
}, { onConflict: "id" });

// Allow credential repair before the clean migration is applied. The legacy
// schema used lowercase enums and required full_name. This branch preserves
// the existing account; it does not migrate or delete tournament data.
if (profileError?.code === "22P02") {
  const legacyResult = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    username,
    full_name: username,
    role: "admin",
    status: "active",
  }, { onConflict: "id" });
  profileError = legacyResult.error;
}
if (profileError) throw profileError;
console.log(`Admin active: ${username} (${user.id})`);

