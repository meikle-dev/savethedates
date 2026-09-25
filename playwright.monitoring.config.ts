import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Runs tests/monitoring.spec.ts against a server whose SENTRY_DSN points at the spec's local fake ingest. Against a
// running server (E2E_BASE_URL), start it with SENTRY_DSN equal to E2E_SENTRY_DSN; see run-app-instructions.md.
const dsn = process.env.E2E_SENTRY_DSN ?? "http://e2epublickey@127.0.0.1:3199/1";

export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: "**/monitoring.spec.ts",
  workers: 1,
  fullyParallel: false,
  projects: base.projects?.filter(({ name }) => name === "desktop"),
  webServer: process.env.E2E_BASE_URL || !base.webServer || Array.isArray(base.webServer) ? undefined : {
    ...base.webServer,
    env: { ...base.webServer.env, SENTRY_DSN: dsn, SENTRY_ENVIRONMENT: "e2e", APP_RELEASE: "e2e-release" },
  },
});
