// Only public marketing pages are counted. Wedding pages carry the guest link secret in their path, and dashboard
// and account pages are private, so they never reach analytics. Query strings are never sent.
const trackedPaths = new Set(["/", "/what-we-offer", "/digital-save-the-date", "/guides/save-the-date-wording", "/demo", "/privacy", "/terms", "/refunds", "/account/sign-in", "/account/sign-up"]);

export function trackedPath(pathname: string | null): string | null {
  if (!pathname) return null;
  // Fictional example pages, including their Invitation, Details and RSVP pages (Pinterest pins link to these).
  if (trackedPaths.has(pathname) || /^\/examples\/[a-z-]+(\/(invitation|details|rsvp))?$/.test(pathname)) return pathname;
  return null;
}
