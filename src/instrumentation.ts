import type { Instrumentation } from "next";

// Sentry is loaded only when SENTRY_DSN is set at runtime; otherwise nothing is sent anywhere.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sentryConfig } = await import("./lib/monitoring/config");
  const config = sentryConfig();
  if (config) (await import("./lib/monitoring/sentry-server")).startServerMonitoring(config);
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  (await import("./lib/monitoring/request-error")).reportRequestError(error, request, context);
};
