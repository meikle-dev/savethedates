import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // Needs a server with a fake Sentry DSN: npm run test:monitoring (playwright.monitoring.config.ts).
  testIgnore: "**/monitoring.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    env: {
      APP_ORIGIN: "http://127.0.0.1:3100",
      AUTH_GOOGLE_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_test_local_webhook_verification_only",
      STRIPE_WEBHOOK_SECRET: "whsec_local_webhook_test_secret",
    },
    // E2E_PRODUCTION=1 serves the existing `npm run build` output, so pages are not compiled on first request.
    command: process.env.E2E_PRODUCTION ? "npm run start -- --port 3100" : "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
