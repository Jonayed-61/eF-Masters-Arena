import { createClient } from "@supabase/supabase-js";

const startDate = process.argv.find((value) => value.startsWith("--start-date="))?.split("=")[1];
if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate ?? "")) throw new Error("Pass the real tournament start date as --start-date=YYYY-MM-DD.");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server environment variables are required.");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: existing, error: findError } = await supabase.from("tournaments").select("id").eq("name", "eF Masters Pro League 0").maybeSingle();
if (findError) throw findError;
if (existing) { console.log(`Tournament already exists: ${existing.id}`); process.exit(0); }
const { data, error } = await supabase.from("tournaments").insert({ name: "eF Masters Pro League 0", organizer: "eF Masters Arena", status: "ACTIVE", start_date: startDate, current_matchweek: 0 }).select("id").single();
if (error) throw error;
console.log(`Tournament provisioned: ${data.id}`);

