import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function createClient() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookieOptions: { name: "wedding-auth", httpOnly: true, sameSite: "lax", secure: process.env.APP_ORIGIN?.startsWith("https://") },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (updates) => {
        try {
          updates.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy refreshes them first.
        }
      },
    },
  });
}
