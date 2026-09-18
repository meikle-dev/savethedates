import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// Test-only admin access, obtained in memory from the local CLI, never from hosted credentials.
export function localSupabase() {
  let output = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      output = execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      break;
    } catch (error) {
      const message = String((error as { stderr?: string }).stderr ?? error);
      if (!message.includes("telemetry.json") || !message.includes("EPERM") || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
    }
  }
  const status = JSON.parse(output);
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
