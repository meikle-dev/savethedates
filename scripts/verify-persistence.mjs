import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const cli = ["node_modules/supabase/dist/supabase.js"];
const status = () => JSON.parse(execFileSync(process.execPath, [...cli, "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const first = status();
const admin = createClient(first.API_URL, first.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `persistence-${crypto.randomUUID()}@example.test`;
const password = `Persistence-${crypto.randomUUID()}`;
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error || !data.user) throw new Error(`Could not create persistence test user: ${error?.message}`);
const id = data.user.id;
try {
  const client = createClient(first.API_URL, first.PUBLISHABLE_KEY ?? first.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  if ((await client.auth.signInWithPassword({ email, password })).error) throw new Error("Could not sign in before restart.");
  const draft = { owner_id: id, first_name: "Before", second_name: "Restart", wedding_date: "2028-08-08", location: "Local", message: "Persist me" };
  if ((await client.from("weddings").insert(draft)).error) throw new Error("Could not write draft before restart.");
  execFileSync(process.execPath, [...cli, "stop"], { stdio: "inherit" });
  execFileSync(process.execPath, [...cli, "start"], { stdio: "inherit" });
  const after = status();
  const restarted = createClient(after.API_URL, after.PUBLISHABLE_KEY ?? after.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let signedIn = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    if (!(await restarted.auth.signInWithPassword({ email, password })).error) { signedIn = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!signedIn) throw new Error("Could not sign in after restart.");
  const result = await restarted.from("weddings").select("location, message").eq("owner_id", id).single();
  if (result.error || result.data?.location !== "Local" || result.data?.message !== "Persist me") throw new Error("Draft did not persist across restart.");
  console.log("Supabase persistence smoke passed across stop/start.");
} finally { await admin.auth.admin.deleteUser(id); }
