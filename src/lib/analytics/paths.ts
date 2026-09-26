// Only public marketing pages are counted. Wedding pages carry the guest link secret in their path, and dashboard
// and account pages are private, so they never reach analytics. Query strings are never sent.
const trackedPaths = new Set(["/", "/what-we-offer", "/digital-save-the-date", "/demo", "/privacy", "/terms", "/refunds", "/account/sign-in", "/account/sign-up"]);

export function trackedPath(pathname: string | null): string | null {
  if (!pathname) return null;
  if (trackedPaths.has(pathname) || /^\/examples\/[a-z-]+$/.test(pathname)) return pathname;
  return null;
}
