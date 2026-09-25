import "server-only";
import { notFound, redirect } from "next/navigation";
import { publicClient } from "@/lib/supabase/public";
import type { WeddingTheme } from "./themes";
import type { Wedding } from "./wedding";
import { detailsSchema, type WeddingDetailsPage } from "./details";
import { guestHrefs, guestSecretPattern } from "./guest-link";
import { parsePhotoFraming, type PhotoFraming } from "./photo-framing";

export type WeddingContent = { first_name: string; second_name: string; wedding_date: string; location: string; message: string; photo_path: string | null; photo_framing: unknown; theme: WeddingTheme; details_enabled: boolean; rsvp_enabled: boolean };
export type GuestWedding = WeddingContent & { slug: string; rsvp_open: boolean };

export function toWedding(row: WeddingContent, photoUrl: string): Wedding {
  return { theme: row.theme, names: [row.first_name, row.second_name], date: row.wedding_date, location: row.location, message: row.message,
    image: row.photo_path ? { src: photoUrl, alt: "" } : undefined, photoFraming: parsePhotoFraming(row.photo_framing) };
}

const configured = () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_PUBLISHABLE_KEY;

/** The published, entitled wedding for a guest link secret, or null. Never looks a wedding up by its names part. */
export async function guestWedding(secret: string): Promise<GuestWedding | null> {
  if (!guestSecretPattern.test(secret) || !configured()) return null;
  const { data, error } = await publicClient().rpc("guest_wedding", { requested_secret: secret }).maybeSingle<GuestWedding>();
  if (error) throw new Error("Unable to load wedding.");
  return data;
}

/**
 * Resolves a guest page. Unknown, replaced, unpublished and expired links all give the same 404; an outdated or
 * altered names part redirects to the current one so renaming never breaks a shared link.
 */
export async function requireGuestWedding(names: string, secret: string, page: "home" | "details" | "rsvp", onRejected?: (reason: "malformed_secret" | "unknown_secret") => void) {
  const wedding = await guestWedding(secret);
  if (!wedding) {
    onRejected?.(guestSecretPattern.test(secret) ? "unknown_secret" : "malformed_secret");
    notFound();
  }
  const hrefs = guestHrefs(wedding.slug, secret);
  if (names !== wedding.slug) redirect(hrefs[page]);
  return { wedding, hrefs };
}

export async function guestWeddingDetails(secret: string): Promise<(WeddingDetailsPage & { photoFraming: PhotoFraming }) | null> {
  if (!guestSecretPattern.test(secret) || !configured()) return null;
  const { data, error } = await publicClient().rpc("guest_wedding_details", { requested_secret: secret }).maybeSingle<Omit<WeddingDetailsPage, "details_enabled"> & { photo_framing: unknown }>();
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
