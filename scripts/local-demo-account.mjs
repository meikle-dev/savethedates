import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const status = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
if (new URL(status.API_URL).hostname !== "127.0.0.1") throw new Error("Expected the local Supabase stack.");
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = "local-demo@example.test";
const password = "SaveTheDatesLocal123!";
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (users.error) throw users.error;
let user = users.data.users.find((candidate) => candidate.email === email);
if (!user) {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("Unable to create local demo account.");
  user = created.data.user;
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (updated.error) throw updated.error;
}
const existing = await admin.from("weddings").select("id").eq("owner_id", user.id).maybeSingle();
if (existing.error) throw existing.error;
if (!existing.data) {
  const inserted = await admin.from("weddings").insert({ owner_id: user.id, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath, England", message: "A local demo wedding for testing." });
  if (inserted.error) throw inserted.error;
}
console.log(`Local demo account ready: ${email} / ${password}`);
