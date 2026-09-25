import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeIdentity, sentryConfig } from "./config";

afterEach(() => vi.unstubAllEnvs());

describe("monitoring configuration", () => {
  it("is off when SENTRY_DSN is unset, blank or not an HTTP URL", () => {
    for (const value of ["", "  ", "not a url", "ftp://key@example.test/1"]) {
      vi.stubEnv("SENTRY_DSN", value);
      expect(sentryConfig()).toBeNull();
    }
  });
  it("is read from the environment on every call", () => {
    vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.de.sentry.io/2");
    vi.stubEnv("SENTRY_ENVIRONMENT", "staging");
    vi.stubEnv("APP_RELEASE", "abc123");
    expect(sentryConfig()).toEqual({ dsn: "https://key@o1.ingest.de.sentry.io/2", environment: "staging", release: "abc123" });
    vi.stubEnv("SENTRY_ENVIRONMENT", "production");
    expect(sentryConfig()?.environment).toBe("production");
  });
  it("labels unconfigured runs as local and unreleased", () => {
    vi.stubEnv("SENTRY_ENVIRONMENT", "");
    vi.stubEnv("APP_RELEASE", "");
    expect(runtimeIdentity()).toEqual({ environment: "local", release: "unreleased" });
  });
});
