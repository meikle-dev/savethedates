import { createHash, timingSafeEqual } from "node:crypto";
import { themes } from "../features/weddings/themes";

// Staging (APP_ENV=staging) is private: every response needs HTTP basic auth and carries noindex, and robots.txt
// disallows everything. Production leaves APP_ENV unset. Setup: docs/operations.md (Staging access).

type StagingEnv = Record<string, string | undefined>;
export type StagingAccess = "unrestricted" | "open" | "granted" | "denied" | "misconfigured";

const minimumPasswordLength = 16;
// Exact files only: other /media/themes/<x> paths match the guest routes (names "media", secret "themes").
const themeImages = new Set(themes.map(({ id }) => `/media/themes/${id}.webp`));
// Google's OAuth consent screen needs a reachable homepage and privacy policy. Exact paths only; both are public on production.
const publicPages = new Set(["/", "/privacy", "/terms", "/refunds"]);

/** Paths that answer without the staging password. Each authenticates itself or holds nothing private. */
function isOpenPath(pathname: string) {
  return pathname === "/api/stripe/webhook" // Authenticated by its Stripe signature.
    || pathname === "/api/health" // The host's health check can't send credentials; it returns only "ok".
    || themeImages.has(pathname) // Fictional theme images. next/image fetches them internally with no request headers.
    || publicPages.has(pathname);
}

/** Any APP_ENV value marks a non-production environment. Only "staging" is valid; others fail closed in the proxy. */
export function isStaging(env: StagingEnv = process.env) {
  return !!env.APP_ENV?.trim();
}

export function stagingAccess(pathname: string, authorization: string | null, env: StagingEnv = process.env): StagingAccess {
  if (!isStaging(env)) return "unrestricted";
  const username = env.STAGING_USERNAME?.trim() ?? "";
  const password = env.STAGING_PASSWORD ?? "";
  if (env.APP_ENV?.trim() !== "staging" || !username || password.length < minimumPasswordLength) return "misconfigured";
  if (isOpenPath(pathname)) return "open";
  return credentialsMatch(authorization, username, password) ? "granted" : "denied";
}

function credentialsMatch(authorization: string | null, username: string, password: string) {
  const encoded = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization?.trim() ?? "")?.[1];
  if (!encoded) return false;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  // Compare both parts, always, as fixed-length digests so timing reveals neither which part was wrong nor its length.
  const usernameMatches = sameSecret(decoded.slice(0, separator), username);
  const passwordMatches = sameSecret(decoded.slice(separator + 1), password);
  return usernameMatches && passwordMatches;
}

function sameSecret(candidate: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}

/** The response for a refused staging request. It never reaches the application or Supabase. */
export function stagingRefusal(access: "denied" | "misconfigured") {
  const headers = new Headers({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
  if (access === "misconfigured") return new Response("Staging access is not configured.", { status: 503, headers });
  headers.set("WWW-Authenticate", 'Basic realm="SaveTheDates staging", charset="UTF-8"');
  return new Response("Authentication required.", { status: 401, headers });
}
