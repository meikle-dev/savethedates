import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { publicClient } from "@/lib/supabase/public";
import type { WeddingTheme } from "./themes";
import type { Wedding } from "./wedding";
import { detailsSchema, type WeddingDetailsPage } from "./details";
import type { InvitationPage } from "./invitation";
import { guestHrefs, guestSecretPattern } from "./guest-link";
import { parsePhotoFraming, type PhotoFraming } from "./photo-framing";
import { guestMenu, parseMealMenu, type MealMenu } from "./meal-menu";

export type WeddingContent = { first_name: string; second_name: string; wedding_date: string; location: string; message: string; photo_path: string | null; photo_framing: unknown; theme: WeddingTheme; details_enabled: boolean; rsvp_enabled: boolean };
// rsvp_closes_on is projected only while RSVP is enabled (null otherwise), so guests are never shown an inactive date.
export type GuestWedding = WeddingContent & { slug: string; rsvp_open: boolean; rsvp_closes_on: string | null; invitation_enabled: boolean };

export function toWedding(row: WeddingContent, photoUrl: string): Wedding {
  return { theme: row.theme, names: [row.first_name, row.second_name], date: row.wedding_date, location: row.location, message: row.message,
    image: row.photo_path ? { src: photoUrl, alt: "" } : undefined, photoFraming: parsePhotoFraming(row.photo_framing) };
}

const configured = () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_PUBLISHABLE_KEY;

/** The published, entitled wedding for a guest link secret, or null. Never looks a wedding up by its names part. */
export const guestWedding = cache(async (secret: string): Promise<GuestWedding | null> => {
  if (!guestSecretPattern.test(secret) || !configured()) return null;
  const { data, error } = await publicClient().rpc("guest_wedding", { requested_secret: secret }).maybeSingle<GuestWedding>();
  if (error) throw new Error("Unable to load wedding.");
  return data;
});

/**
 * Resolves a guest page. Unknown, replaced, unpublished and expired links all give the same 404; an outdated or
 * altered names part redirects to the current one so renaming never breaks a shared link.
 */
export async function requireGuestWedding(names: string, secret: string, page: "home" | "invitation" | "details" | "rsvp", onRejected?: (reason: "malformed_secret" | "unknown_secret") => void) {
  const wedding = await guestWedding(secret);
  if (!wedding) {
    onRejected?.(guestSecretPattern.test(secret) ? "unknown_secret" : "malformed_secret");
    notFound();
  }
  const hrefs = guestHrefs(wedding.slug, secret);
  if (names !== wedding.slug) redirect(hrefs[page]);
  return { wedding, hrefs };
}

export const guestWeddingDetails = cache(async (secret: string): Promise<(WeddingDetailsPage & { photoFraming: PhotoFraming }) | null> => {
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
});

type GuestInvitationRow = Pick<InvitationPage, "invitation_host_line" | "invitation_wording" | "invitation_afterwards" | "ceremony_time" | "ceremony_venue" | "ceremony_address">;

/** The invitation's saved wording and ceremony fields, or null when the page is off or the link isn't live. */
export const guestWeddingInvitation = cache(async (secret: string): Promise<GuestInvitationRow | null> => {
  if (!guestSecretPattern.test(secret) || !configured()) return null;
  const { data, error } = await publicClient().rpc("guest_wedding_invitation", { requested_secret: secret }).maybeSingle<GuestInvitationRow>();
  if (error) throw new Error("Unable to load wedding invitation.");
  return data;
});

/** F068: the menu guests choose from, or null unless the site is live, RSVP is open and meal choices are on. */
export const guestRsvpMenu = cache(async (secret: string): Promise<MealMenu | null> => {
  if (!guestSecretPattern.test(secret) || !configured()) return null;
  const { data, error } = await publicClient().rpc("guest_rsvp_menu", { requested_secret: secret });
  if (error) throw new Error("Unable to load the RSVP menu.");
  return data ? guestMenu(parseMealMenu(data)) : null;
});
