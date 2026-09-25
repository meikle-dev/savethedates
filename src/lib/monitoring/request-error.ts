import type { Instrumentation } from "next";
import { errorReason, log, loggedFailure } from "@/lib/logger";
import { isUuid } from "./scrub";

type RequestInfo = Parameters<Instrumentation.onRequestError>[1];
type ErrorContext = Parameters<Instrumentation.onRequestError>[2];
type Tags = { requestId?: string; errorReference?: string; ownerId?: string };
type Reporter = (error: unknown, request: RequestInfo, context: ErrorContext, tags: Tags) => void;

const shared = ((globalThis as { __saveTheDatesErrorReporter?: { reporter?: Reporter } }).__saveTheDatesErrorReporter ??= {});

export function reportErrorsWith(reporter: Reporter) {
  shared.reporter = reporter;
}

/**
 * Handles every unexpected server error once: a log line (unless withLogging already wrote one) and, when
 * configured, a Sentry event. Both carry the request ID and the error reference (digest) shown to the user.
 */
export function reportRequestError(error: unknown, request: RequestInfo, context: ErrorContext) {
  const header = request.headers["x-request-id"];
  const logged = loggedFailure(error);
  const requestId = logged?.requestId ?? (isUuid(header) ? header : undefined);
  const digest = error && typeof error === "object" && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;
  if (!logged) {
    log.error("app.request.failed", { reason: errorReason(error), errorReference: digest }, { requestId, route: context.routePath, alert: false });
  }
  try {
    shared.reporter?.(error, request, context, { requestId, errorReference: digest, ownerId: logged?.ownerId });
  } catch {
    // Monitoring must never replace the original error.
  }
}
