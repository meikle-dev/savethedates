// F043/F065: guest pages live under /<names>/<secret>. Each wedding has two secrets, one per link: the Save the Date
// link (rsvp_share_secret) and the Invitation link (invitation_share_secret). The secret identifies the wedding and
// the link; the names part is decorative, may be shared by several weddings and can change at any time.

export const guestSecretPattern = /^[A-Za-z0-9_-]{43}$/;

// The names part is the first path segment, so it must never equal a top-level route in src/app or folder in public/.
// Keep identical to the wedding_slug_valid check in the latest migration that sets it (guest-link.test.ts compares them).
// Before adding a new top-level route, add it here and in a migration, after checking no wedding uses it.
export const reservedNames = new Set([
  "account", "auth", "dashboard", "api", "media", "preview", "preview-photo", "demo", "demo-no-photo", "demo-long-names",
  "pricing", "features", "guides", "examples", "privacy", "terms", "support", "robots", "sitemap", "favicon",
  "s", "contact", "refunds", "assets", "fonts", "digital-save-the-date", "what-we-offer",
]);

export type GuestHrefs = { home: string; invitation: string; details: string; rsvp: string };

export function guestHrefs(names: string, secret: string): GuestHrefs {
  const home = `/${names}/${secret}`;
  return { home, invitation: `${home}/invitation`, details: `${home}/details`, rsvp: `${home}/rsvp` };
}

/** The absolute guest link couples see, copy and share, always on the configured application origin (APP_ORIGIN). */
export function guestUrl(origin: string, names: string, secret: string, page: keyof GuestHrefs = "home") {
  return new URL(guestHrefs(names, secret)[page], origin).href;
}

export type GuestLinkKind = "save_the_date" | "invitation";
export type GuestPage = keyof GuestHrefs;
type PageSwitches = { invitation_enabled: boolean; details_enabled: boolean; rsvp_enabled: boolean };

/**
 * F065: the pages a link opens. The database enforces the same table (20260926000200_separate_guest_links.sql).
 * The Invitation link works only while the Invitation is on; RSVP belongs to it then, and to the Save the Date link
 * otherwise.
 */
export function linkPages(link: GuestLinkKind, on: PageSwitches): Record<GuestPage, boolean> {
  const usable = link === "save_the_date" || on.invitation_enabled;
  return {
    home: link === "save_the_date",
    invitation: link === "invitation" && on.invitation_enabled,
    details: usable && on.details_enabled,
    rsvp: on.rsvp_enabled && (link === "invitation" ? on.invitation_enabled : !on.invitation_enabled),
  };
}

/** The link that currently offers RSVP, and so carries the RSVP link couples send. */
export const rsvpLink = (on: { invitation_enabled: boolean }): GuestLinkKind => on.invitation_enabled ? "invitation" : "save_the_date";

/** Owner preview pages for one link and theme. The link is carried in the URL so Details and RSVP keep its navigation. */
export function previewHrefs(theme: string, link: GuestLinkKind): GuestHrefs {
  const query = `?theme=${theme}${link === "invitation" ? "&link=invitation" : ""}`;
  return { home: `/dashboard/preview${query}`, invitation: `/dashboard/preview/invitation${query}`, details: `/dashboard/preview/details${query}`, rsvp: `/dashboard/preview/rsvp${query}` };
}

/** Navigation for one link: an href only for each page that link opens. */
export function linkNavigation(link: GuestLinkKind, on: PageSwitches, hrefs: GuestHrefs) {
  const pages = linkPages(link, on);
  return {
    homeHref: pages.home ? hrefs.home : undefined,
    invitationHref: pages.invitation ? hrefs.invitation : undefined,
    detailsHref: pages.details ? hrefs.details : undefined,
    rsvpHref: pages.rsvp ? hrefs.rsvp : undefined,
  };
}

const namePart = (name: string) => name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** A valid names part suggested from the couple's names, used until the couple saves their own. */
export function suggestedNames(firstName: string, secondName: string) {
  const value = [namePart(firstName), namePart(secondName)].filter(Boolean).join("-and-").slice(0, 63).replace(/-+$/, "");
  return value.length >= 3 && !reservedNames.has(value) ? value : "our-wedding";
}

/** The names part guests see: the saved one, or the suggestion before one is saved. */
export function currentNames(wedding: { slug: string | null; first_name: string; second_name: string }) {
  return wedding.slug ?? suggestedNames(wedding.first_name, wedding.second_name);
}

/** Route pattern for revalidating every guest page without handling any secret. */
export const guestPagesRoute = "/[names]/[secret]";
