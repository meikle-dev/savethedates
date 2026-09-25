import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { errorReason, log } from "@/lib/logger";

const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };
export function missingPhoto() { return new Response(null, { status: 404, headers }); }
export async function photoResponse(client: SupabaseClient, path: string | null) {
  if (!path) return missingPhoto();
  const { data, error } = await client.storage.from("wedding-photos").download(path);
  if (error || !data) {
    // A saved photo path that cannot be read means Storage and the database disagree, or Storage is failing.
    log.error("photo.read.failed", { reason: errorReason(error) });
    return missingPhoto();
  }
  return new Response(data, { headers: { ...headers, "Content-Type": "image/webp" } });
}
