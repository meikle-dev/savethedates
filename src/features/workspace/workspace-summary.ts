import { hasVenue, type WeddingDetails } from "../weddings/details";
import type { SharedResponse } from "../weddings/rsvp";

const dayMs = 24 * 60 * 60 * 1000;

function utcDay(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// Whole calendar days between two ISO dates (negative once the wedding has passed).
export function daysUntil(weddingDate: string, today: string) {
  return Math.round((utcDay(weddingDate) - utcDay(today)) / dayMs);
}

export type RsvpResponse = { id: string; name: string; attending: boolean; respondedAt: string | null };

// The query already orders shared responses newest first.
export function collectResponses(sharedResponses: SharedResponse[]): RsvpResponse[] {
  return sharedResponses.map((response) => ({ id: response.id, name: response.responding_name, attending: response.attending, respondedAt: response.responded_at }));
}

export type RsvpAvailability = "off" | "not-live" | "open" | "closed" | "offline";

// Guests can only reply while RSVPs are enabled, not past the closing date (compared as UTC dates, as the database
// does), and the site is live. `offline` is a published site whose purchase has expired or ended: guests get a 404.
export function rsvpAvailability(enabled: boolean, closesOn: string | null, today: string, live: boolean, offline = false): RsvpAvailability {
  if (offline) return "offline";
  if (!enabled) return "off";
  if (closesOn && today > closesOn) return "closed";
  return live ? "open" : "not-live";
}

export type SetupStep = { id: string; label: string; done: boolean; href: string; optional?: boolean };

// F060: Invitation and Details are optional pages, so their steps never hold back a finished setup.
export function setupSteps(wedding: WeddingDetails & { photo_path: string | null; rsvp_enabled: boolean; invitation_enabled: boolean }, purchased: boolean, live: boolean): SetupStep[] {
  return [
    { id: "basics", label: "Add your names and date", done: true, href: "/dashboard/basics" },
    { id: "photo", label: "Add a photo", done: !!wedding.photo_path, href: "/dashboard/design", optional: true },
    { id: "invitation", label: "Set up your invitation", done: wedding.invitation_enabled, href: "/dashboard/invitation", optional: true },
    { id: "details", label: "Add ceremony or reception details", done: wedding.details_enabled && (hasVenue(wedding, "ceremony") || hasVenue(wedding, "reception")), href: "/dashboard/details", optional: true },
    { id: "rsvp", label: "Open RSVPs", done: wedding.rsvp_enabled, href: "/dashboard/rsvp" },
    { id: "purchase", label: "Purchase your site", done: purchased, href: "/dashboard/publish" },
    { id: "publish", label: "Publish your site", done: live, href: "/dashboard/publish" },
  ];
}

export type GuestPageStatus = { id: "home" | "invitation" | "details" | "rsvp"; label: string; status: string; on: boolean; href: string };

const rsvpStatus: Record<RsvpAvailability, string> = { open: "Open", "not-live": "Opens when published", closed: "Closed", off: "Off", offline: "Site offline" };

/** Each guest page in guest order, with whether it's switched on, for the Overview's Guest pages card. */
export function guestPageStatuses(wedding: { invitation_enabled: boolean; details_enabled: boolean }, rsvp: RsvpAvailability, live: boolean): GuestPageStatus[] {
  const shown = (enabled: boolean) => enabled ? live ? "On" : "On when published" : "Off";
  return [
    { id: "home", label: "Save the Date", status: "Always on", on: true, href: "/dashboard/basics" },
    { id: "invitation", label: "Invitation", status: shown(wedding.invitation_enabled), on: wedding.invitation_enabled, href: "/dashboard/invitation" },
    { id: "details", label: "Details", status: shown(wedding.details_enabled), on: wedding.details_enabled, href: "/dashboard/details" },
    { id: "rsvp", label: "RSVP", status: rsvpStatus[rsvp], on: rsvp === "open" || rsvp === "not-live", href: "/dashboard/rsvp" },
  ];
}
