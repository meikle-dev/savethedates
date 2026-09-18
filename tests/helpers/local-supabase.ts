import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// Test-only admin access, obtained in memory from the local CLI, never from hosted credentials.
export function localSupabase() {
  const status = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  if (new URL(status.API_URL).hostname !== "127.0.0.1") throw new Error("Tests require the local Supabase stack.");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return {
    admin: createClient(status.API_URL, status.SERVICE_ROLE_KEY, options),
    anonymous: () => createClient(status.API_URL, status.PUBLISHABLE_KEY ?? status.ANON_KEY, options),
    apiUrl: status.API_URL as string,
    publicKey: (status.PUBLISHABLE_KEY ?? status.ANON_KEY) as string,
    mailUrl: (status.MAILPIT_URL ?? status.INBUCKET_URL) as string,
  };
}
