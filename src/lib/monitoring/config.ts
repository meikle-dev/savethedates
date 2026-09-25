// Monitoring configuration is read from the runtime environment on every call, never at build time, so one image
// serves every environment. Nothing is sent anywhere when SENTRY_DSN is unset (local development, CI, tests).

export type SentryRuntimeConfig = { dsn: string; environment: string; release: string };

export function runtimeIdentity() {
  return {
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || "local",
    release: process.env.APP_RELEASE?.trim() || "unreleased",
  };
}

export function sentryConfig(): SentryRuntimeConfig | null {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return null;
  try {
    if (!/^https?:$/.test(new URL(dsn).protocol)) return null;
  } catch {
    return null;
  }
  return { dsn, ...runtimeIdentity() };
}
