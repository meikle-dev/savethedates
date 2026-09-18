import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for verified payment webhooks.");
  return createClient(supabaseConfig().url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
