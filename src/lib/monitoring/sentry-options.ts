import type { BrowserOptions, NodeOptions } from "@sentry/nextjs";
import type { SentryRuntimeConfig } from "./config";
import { scrubBreadcrumb, scrubEvent, scrubLog } from "./scrub";

/** Settings shared by the browser and server SDKs. Integrations are chosen per runtime by the caller. */
export function sentryOptions(config: SentryRuntimeConfig) {
  return {
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // No sentry-trace/baggage headers on requests to Supabase, Stripe or the app itself.
    tracePropagationTargets: [],
    enableLogs: true,
    beforeSend: (event) => scrubEvent(event),
    beforeSendLog: (entry) => scrubLog(entry),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  } satisfies BrowserOptions & NodeOptions;
}
