import { describe, expect, it } from "vitest";
import { isStaging, stagingAccess, stagingRefusal } from "./staging-access";

const staging = { APP_ENV: "staging", STAGING_USERNAME: "team", STAGING_PASSWORD: "correct-horse-battery-staple" };
const basic = (credentials: string) => `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;

describe("staging access", () => {
  it("leaves production and local development unrestricted", () => {
    for (const APP_ENV of [undefined, "", "  "]) {
      expect(isStaging({ APP_ENV })).toBe(false);
      expect(stagingAccess("/dashboard", null, { APP_ENV })).toBe("unrestricted");
    }
  });
  it("grants every path only with the exact username and password", () => {
    for (const path of ["/dashboard", "/names/secret/rsvp", "/robots.txt", "/favicon.ico", "/media/share", "/digital-save-the-date"]) {
      expect(stagingAccess(path, basic("team:correct-horse-battery-staple"), staging)).toBe("granted");
      expect(stagingAccess(path, null, staging)).toBe("denied");
    }
  });
  it("denies wrong, partial and malformed credentials", () => {
    for (const authorization of [
      basic("team:wrong-password-of-some-length"), basic("other:correct-horse-battery-staple"), basic("team:correct-horse-battery-stapl"),
      basic("team"), basic(":correct-horse-battery-staple"), basic("team:correct-horse-battery-staple:extra"), "Bearer abc", "Basic", "Basic !!!", "",
    ]) {
      expect(stagingAccess("/dashboard", authorization, staging)).toBe("denied");
    }
  });
  it("accepts a password containing a colon", () => {
    const env = { ...staging, STAGING_PASSWORD: "has:a-colon-inside-it" };
    expect(stagingAccess("/dashboard", basic("team:has:a-colon-inside-it"), env)).toBe("granted");
  });
  it("opens only the signed webhook, the health check, the fictional theme images, the homepage and legal pages", () => {
    for (const path of ["/api/stripe/webhook", "/api/health", "/media/themes/bold.webp", "/", "/privacy", "/terms", "/refunds"]) {
      expect(stagingAccess(path, null, staging)).toBe("open");
    }
    for (const path of [
      "/api/stripe/webhook/x", "/api/health/", "/api/runtime-config", "/media/share", "/media/themes", "/media/lake-como.webp",
      "//", "/privacy/", "/privacy/x", "/terms/details", "/refunds/rsvp", "/Privacy", "/account/sign-up", "/dashboard/publish",
      // These match the guest routes (names "media", secret "themes") and must stay behind the password.
      "/media/themes/rsvp", "/media/themes/details", "/media/themes/photo", "/media/themes/a/b", "/media/themes/unknown.webp",
    ]) expect(stagingAccess(path, null, staging)).toBe("denied");
  });
  it("fails closed when staging is misconfigured", () => {
    for (const env of [
      { ...staging, STAGING_USERNAME: "" }, { ...staging, STAGING_PASSWORD: undefined }, { ...staging, STAGING_PASSWORD: "fifteen-chars!!" },
      { ...staging, APP_ENV: "production" }, { ...staging, APP_ENV: "Staging" },
    ]) {
      expect(isStaging(env)).toBe(true);
      expect(stagingAccess("/api/health", basic("team:correct-horse-battery-staple"), env)).toBe("misconfigured");
    }
  });
  it("challenges for credentials and never lets the refusal be cached or indexed", () => {
    const denied = stagingRefusal("denied");
    expect(denied.status).toBe(401);
    expect(denied.headers.get("WWW-Authenticate")).toMatch(/^Basic realm=/);
    const misconfigured = stagingRefusal("misconfigured");
    expect(misconfigured.status).toBe(503);
    expect(misconfigured.headers.get("WWW-Authenticate")).toBeNull();
    for (const response of [denied, misconfigured]) {
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    }
  });
});
