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

export function setupSteps(wedding: WeddingDetails & { photo_path: string | null; rsvp_enabled: boolean }, purchased: boolean, live: boolean): SetupStep[] {
  return [
    { id: "basics", label: "Add your names and date", done: true, href: "/dashboard/basics" },
    { id: "photo", label: "Add a photo", done: !!wedding.photo_path, href: "/dashboard/design", optional: true },
    { id: "details", label: "Share ceremony or reception details", done: wedding.details_enabled && (hasVenue(wedding, "ceremony") || hasVenue(wedding, "reception")), href: "/dashboard/details" },
    { id: "rsvp", label: "Open RSVPs", done: wedding.rsvp_enabled, href: "/dashboard/rsvp" },
    { id: "purchase", label: "Purchase your site", done: purchased, href: "/dashboard/publish" },
    { id: "publish", label: "Publish your site", done: live, href: "/dashboard/publish" },
  ];
}
