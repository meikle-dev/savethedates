import { createClient } from "@/lib/supabase/server";

/** Only chooses navigation labels; marketing pages stay available when account state cannot be verified. */
export async function isSignedIn() {
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}
