import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const paths = [".env.local", ".env.docker"];
if (!process.argv.includes("--force") && paths.some(existsSync)) {
  throw new Error("Environment files already exist. Review them before using --force to replace local configuration.");
}
const status = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
if (new URL(status.API_URL).hostname !== "127.0.0.1") throw new Error("Expected the local Supabase stack.");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (!key) throw new Error("Local Supabase publishable key is missing.");
const values = (url) => `# Generated local development configuration. Never commit this file.\nSUPABASE_URL=${url}\nSUPABASE_PUBLISHABLE_KEY=${key}\nAPP_ORIGIN=http://127.0.0.1:3000\n`;
writeFileSync(paths[0], values(status.API_URL), { mode: 0o600 });
writeFileSync(paths[1], values("http://host.docker.internal:54321"), { mode: 0o600 });
console.log("Wrote .env.local and .env.docker using the local publishable key. No admin key was written.");
