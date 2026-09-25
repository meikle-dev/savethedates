import "server-only";

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configure local Supabase using npm run local:env.");
  return { url, key };
}

// Supabase must have the Google provider enabled too; the flag only shows the option.
export function googleSignInEnabled() {
  return process.env.AUTH_GOOGLE_ENABLED === "true";
}

export function appOrigin() {
  const url = process.env.APP_ORIGIN;
  if (!url) throw new Error("APP_ORIGIN is required for authentication email links and guest links.");
  return new URL(url).origin;
}
