import "server-only";
import { publicClient } from "@/lib/supabase/public";
import type { WeddingTheme } from "./themes";
import type { Wedding } from "./wedding";
import { detailsSchema, type WeddingDetailsPage } from "./details";
import { hashInvitationToken, type GuestRsvp } from "./rsvp";
import { parsePhotoFraming, type PhotoFraming } from "./photo-framing";

export type WeddingContent = { first_name: string; second_name: string; wedding_date: string; location: string; message: string; photo_path: string | null; photo_framing: unknown; theme: WeddingTheme; details_enabled: boolean; rsvp_enabled: boolean };
export function toWedding(row: WeddingContent, photoUrl: string): Wedding {
  return { theme: row.theme, names: [row.first_name, row.second_name], date: row.wedding_date, location: row.location, message: row.message,
    image: row.photo_path ? { src: photoUrl, alt: "" } : undefined, photoFraming: parsePhotoFraming(row.photo_framing) };
}
export async function publishedWedding(slug: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  const { data, error } = await publicClient().rpc("published_wedding", { requested_slug: slug }).maybeSingle<WeddingContent>();
  if (error) throw new Error("Unable to load wedding.");
  return data;
}

export async function publishedGuestRsvp(slug: string, token: string): Promise<GuestRsvp | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  const { data, error } = await publicClient().rpc("guest_rsvp", { requested_slug: slug, requested_token_hash: hashInvitationToken(token) }).maybeSingle<GuestRsvp>();
  if (error) throw new Error("Unable to load RSVP.");
  return data;
}

export async function publishedWeddingDetails(slug: string): Promise<(WeddingDetailsPage & { photoFraming: PhotoFraming }) | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  const { data, error } = await publicClient().rpc("published_wedding_details", { requested_slug: slug }).maybeSingle<Omit<WeddingDetailsPage, "details_enabled"> & { photo_framing: unknown }>();
  if (error) throw new Error("Unable to load wedding details.");
  if (!data) return null;
  return {
    ...detailsSchema.parse({ ...data, details_enabled: true }),
    first_name: data.first_name,
    second_name: data.second_name,
    theme: data.theme as WeddingTheme,
    photoFraming: parsePhotoFraming(data.photo_framing),
  };
}
