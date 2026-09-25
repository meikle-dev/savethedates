// Browser monitoring. Configuration comes from a no-store runtime route, so static pages never freeze it and one
// image serves every environment. With SENTRY_DSN unset the SDK is never downloaded and nothing leaves the site.
import type { SentryRuntimeConfig } from "./config";

type SentryModule = typeof import("./sentry-browser");
const shared = ((globalThis as { __saveTheDatesMonitoring?: { sentry?: Promise<SentryModule | null> } }).__saveTheDatesMonitoring ??= {});

async function loadConfig(): Promise<SentryRuntimeConfig | null> {
  const response = await fetch("/api/runtime-config", { cache: "no-store", credentials: "omit" });
  if (!response.ok) return null;
  const { sentry } = (await response.json()) as { sentry?: Partial<SentryRuntimeConfig> | null };
  if (typeof sentry?.dsn !== "string" || typeof sentry.environment !== "string" || typeof sentry.release !== "string") return null;
  return { dsn: sentry.dsn, environment: sentry.environment, release: sentry.release };
}

export function startBrowserMonitoring() {
  shared.sentry ??= loadConfig()
    .then(async (config) => {
      if (!config) return null;
      // The scrubber loads with the SDK, so pages without Sentry never download it.
      const [Sentry, { sentryOptions }] = await Promise.all([import("./sentry-browser"), import("./sentry-options")]);
      Sentry.init({
        ...sentryOptions(config),
        // No tracing, no session pings on page views, and no console or DOM breadcrumbs: click breadcrumbs carry
        // accessible names such as "Correct or remove response from <guest name>".
        integrations: (defaults) => [
          ...defaults.filter((integration) => !["BrowserTracing", "BrowserSession", "Breadcrumbs"].includes(integration.name)),
          Sentry.breadcrumbsIntegration({ console: false, dom: false }),
        ],
      });
      return Sentry;
    })
    .catch(() => null);
  return shared.sentry;
}

/** Reports an error caught by an error boundary. Server errors (with a digest) were already reported on the server. */
export function captureClientError(error: Error & { digest?: string }) {
  if (error.digest) return;
  void startBrowserMonitoring().then((Sentry) => Sentry?.captureException(error));
}
