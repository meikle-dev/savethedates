// F043: each wedding has one private guest link, /<names>/<secret>, that opens every guest page.
// The secret (the wedding's 43-character rsvp_share_secret) identifies the wedding; the names part is
// decorative, may be shared by several weddings and can change at any time.

export const guestSecretPattern = /^[A-Za-z0-9_-]{43}$/;

// The names part is the first path segment, so it must never equal a top-level route in src/app or folder in public/.
// Keep identical to the wedding_slug_valid check in the latest migration that sets it (guest-link.test.ts compares them).
// Before adding a new top-level route, add it here and in a migration, after checking no wedding uses it.
export const reservedNames = new Set([
  "account", "auth", "dashboard", "api", "media", "preview", "preview-photo", "demo", "demo-no-photo", "demo-long-names",
  "pricing", "features", "guides", "examples", "privacy", "terms", "support", "robots", "sitemap", "favicon",
  "s", "contact", "refunds", "assets", "fonts", "digital-save-the-date",
]);

export type GuestHrefs = { home: string; invitation: string; details: string; rsvp: string };

export function guestHrefs(names: string, secret: string): GuestHrefs {
  const home = `/${names}/${secret}`;
  return { home, invitation: `${home}/invitation`, details: `${home}/details`, rsvp: `${home}/rsvp` };
}

/** The absolute guest link couples see, copy and share, always on the configured application origin (APP_ORIGIN). */
export function guestUrl(origin: string, names: string, secret: string) {
  return new URL(guestHrefs(names, secret).home, origin).href;
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
