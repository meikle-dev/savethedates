// Loaded by instrumentation.ts only when SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";
import { forwardLogs } from "@/lib/logger";
import type { SentryRuntimeConfig } from "./config";
import { reportErrorsWith } from "./request-error";
import { sentryOptions } from "./sentry-options";

export function startServerMonitoring(config: SentryRuntimeConfig) {
  Sentry.init({
    ...sentryOptions(config),
    // Console breadcrumbs could carry values that bypass the logger's allow-list.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== "Console"),
  });

  forwardLogs((line, { alert }) => {
    const { level, event } = line;
    const attributes = Object.fromEntries(Object.entries(line).filter(([key]) => !["timestamp", "level", "event"].includes(key)));
    if (level !== "debug") Sentry.logger[level](event, attributes);
    // Log lines are not issues; an error line also opens an issue so that it triggers the email alert.
    if (alert) {
      Sentry.withScope((scope) => {
        scope.setTag("request_id", line.requestId);
        scope.setTag("log_event", event);
        if (line.ownerId) scope.setUser({ id: line.ownerId });
        scope.setFingerprint([event]);
        Sentry.captureMessage(event, "error");
      });
    }
  });

  reportErrorsWith((error, request, context, tags) => {
    Sentry.withScope((scope) => {
      if (tags.requestId) scope.setTag("request_id", tags.requestId);
      if (tags.errorReference) scope.setTag("error_reference", tags.errorReference);
      if (tags.ownerId) scope.setUser({ id: tags.ownerId });
      Sentry.captureRequestError(error, request, context);
    });
  });
}
