import "server-only";
import { publicClient } from "@/lib/supabase/public";
import type { Wedding } from "./wedding";

export type WeddingContent = { first_name: string; second_name: string; wedding_date: string; location: string; message: string; photo_path: string | null };
export function toWedding(row: WeddingContent, photoUrl: string): Wedding {
  return { names: [row.first_name, row.second_name], date: row.wedding_date, location: row.location, message: row.message,
    image: row.photo_path ? { src: photoUrl, alt: "" } : undefined };
}
export async function publishedWedding(slug: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  const { data, error } = await publicClient().rpc("published_wedding", { requested_slug: slug }).maybeSingle<WeddingContent>();
  if (error) throw new Error("Unable to load wedding.");
  return data;
}
