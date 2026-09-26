// The only way server code logs. Every line has a stable `area.action.outcome` event name from the list below,
// allow-listed fields and the request ID, so one request ID tells the story of one request.
// Conventions and the "Where to log" table: docs/operations.md (Logging standard).
import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { runtimeIdentity } from "./monitoring/config";
import { isUuid, scrubText } from "./monitoring/scrub";

/** Units of work wrapped by `withLogging`. Each has a `<operation>.failed` event below. */
export const logOperations = [
  "account.signup", "account.signin", "account.recovery", "account.password", "account.signout", "account.confirm", "account.confirmation_resend",
  "account.google", "account.google_callback",
  "workspace.save", "photo.upload", "photo.read", "publication.publish", "publication.unpublish",
  "payment.checkout", "payment.webhook", "rsvp.submit", "rsvp.link", "rsvp.response",
] as const;
export type LogOperation = (typeof logOperations)[number];

// `rejected` is an expected refusal (warn); `failed` is an infrastructure or unexpected fault (error).
export const logEvents = [
  "app.request.failed",
  "account.signup.requested", "account.signup.failed",
  "account.confirmation_resend.requested", "account.confirmation_resend.rejected", "account.confirmation_resend.failed",
  "account.confirm.succeeded", "account.confirm.rejected", "account.confirm.failed",
  "account.signin.rejected", "account.signin.failed",
  "account.recovery.requested", "account.recovery.failed",
  "account.password.updated", "account.password.rejected", "account.password.failed",
  "account.signout.failed",
  "account.google.failed", "account.google_callback.succeeded", "account.google_callback.rejected", "account.google_callback.failed",
  "workspace.save.succeeded", "workspace.save.rejected", "workspace.save.failed", "workspace.ownership.denied",
  "photo.upload.accepted", "photo.upload.rejected", "photo.upload.failed", "photo.read.failed",
  "publication.publish.succeeded", "publication.publish.blocked", "publication.publish.failed",
  "publication.unpublish.succeeded", "publication.unpublish.failed",
  "payment.checkout.created", "payment.checkout.reused", "payment.checkout.conflicted", "payment.checkout.rejected", "payment.checkout.failed",
  "payment.checkout.expired", "payment.stripe.failed",
  "payment.webhook.received", "payment.webhook.rejected", "payment.webhook.duplicate", "payment.webhook.recorded", "payment.webhook.failed",
  "payment.entitlement.granted", "payment.entitlement.revoked",
  "rsvp.submit.accepted", "rsvp.submit.rejected", "rsvp.submit.failed",
  "rsvp.link.rotated", "rsvp.link.rejected", "rsvp.link.failed",
  "rsvp.response.corrected", "rsvp.response.removed", "rsvp.response.rejected", "rsvp.response.failed",
] as const;
export type LogEvent = (typeof logEvents)[number] | `${LogOperation}.completed`;
// Compile-time check that every operation has its failure event in the list.
const everyOperationHasFailure: `${LogOperation}.failed` extends (typeof logEvents)[number] ? true : never = true;
void everyOperationHasFailure;

/** Route templates, never concrete paths: concrete paths can contain secrets and slugs. */
export type LogRoute =
  | "/[names]/[secret]/photo" | "/account/[screen]" | "/api/stripe/webhook" | "/auth/callback" | "/auth/confirm" | "/dashboard"
  | "/dashboard/basics" | "/dashboard/design" | "/dashboard/details" | "/dashboard/invitation" | "/dashboard/photo" | "/dashboard/preview" | "/dashboard/publish"
  | "/dashboard/guests" | "/dashboard/rsvp" | "/[names]/[secret]/rsvp";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type WorkspaceSection = "basics" | "details" | "invitation" | "theme" | "photo_framing" | "rsvp_settings" | "meal_choices" | "guest_link";
export type LogFields = {
  ownerId?: string;
  weddingId?: string;
  stripeEventId?: string;
  eventType?: string;
  reason?: string;
  durationMs?: number;
  count?: number;
  section?: WorkspaceSection;
  errorReference?: string;
};
export type LogLine = LogFields & {
  timestamp: string;
  level: LogLevel;
  event: LogEvent;
  requestId: string;
  environment: string;
  release: string;
  route: string;
};

type RequestContext = { requestId: string; route: string; start: number; ownerId?: string; weddingId?: string; logged: boolean };
type ExplicitContext = { requestId?: string; route?: string; alert?: boolean };
type LogForwarder = (line: LogLine, options: { alert: boolean }) => void;
type SharedState = {
  storage: AsyncLocalStorage<RequestContext>;
  failures: WeakMap<object, { requestId: string; ownerId?: string }>;
  forwarder?: LogForwarder;
};

// Next.js can load this module more than once (instrumentation and route code are bundled separately), so the
// state that links them lives on globalThis.
const shared: SharedState = ((globalThis as { __saveTheDatesLogging?: SharedState }).__saveTheDatesLogging ??= {
  storage: new AsyncLocalStorage<RequestContext>(),
  failures: new WeakMap(),
});
const { storage, failures } = shared;
const sections = new Set<string>(["basics", "details", "invitation", "theme", "photo_framing", "rsvp_settings", "meal_choices", "guest_link"]);
const code = /^[A-Za-z0-9_.:-]{1,80}$/;

const isProduction = () => process.env.NODE_ENV === "production";

/** Registered by Sentry setup so warnings, errors and business events also reach Sentry Logs. */
export function forwardLogs(next: LogForwarder | undefined) {
  shared.forwarder = next;
}

/** A short, safe reason for an unexpected error: its code or class name, never its message. */
export function errorReason(error: unknown): string {
  if (error && typeof error === "object") {
    const value = "code" in error && typeof error.code === "string" && error.code ? error.code : error instanceof Error ? error.name : "";
    if (code.test(value)) return value;
  }
  return "unknown";
}

function cleanFields(fields: LogFields): LogFields {
  const result: LogFields = {};
  if (isUuid(fields.ownerId)) result.ownerId = fields.ownerId;
  if (isUuid(fields.weddingId)) result.weddingId = fields.weddingId;
  if (typeof fields.stripeEventId === "string" && /^evt_[\w-]{1,100}$/.test(fields.stripeEventId)) result.stripeEventId = fields.stripeEventId;
  if (typeof fields.eventType === "string" && code.test(fields.eventType)) result.eventType = fields.eventType;
  if (typeof fields.reason === "string") result.reason = code.test(fields.reason) ? scrubText(fields.reason) : "invalid_reason";
  if (Number.isFinite(fields.durationMs)) result.durationMs = Math.round(fields.durationMs!);
  if (Number.isFinite(fields.count)) result.count = Math.round(fields.count!);
  if (fields.section && sections.has(fields.section)) result.section = fields.section;
  if (typeof fields.errorReference === "string" && /^[\w-]{1,64}$/.test(fields.errorReference)) result.errorReference = fields.errorReference;
  return result;
}

function safeRoute(route: string | undefined) {
  return route && /^\/[\w[\]/.-]*$/.test(route) ? route : "unknown";
}

function format(line: LogLine) {
  if (isProduction()) return JSON.stringify(line);
  const { timestamp, level, event, requestId, route } = line;
  const details = Object.entries(cleanFields(line)).map(([key, value]) => ` ${key}=${value}`).join("");
  return `${timestamp.slice(11, 23)} ${level.toUpperCase().padEnd(5)} ${event} req=${requestId.slice(0, 8)} route=${route}${details}`;
}

function emit(level: LogLevel, event: LogEvent, fields: LogFields = {}, explicit?: ExplicitContext) {
  if (level === "debug" && isProduction()) return;
  const context = storage.getStore();
  if (context) context.logged = true;
  const line: LogLine = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: explicit?.requestId && isUuid(explicit.requestId) ? explicit.requestId : context?.requestId ?? "none",
    ...runtimeIdentity(),
    route: safeRoute(explicit?.route ?? context?.route),
    ...cleanFields({ ownerId: context?.ownerId, weddingId: context?.weddingId, durationMs: context ? Date.now() - context.start : undefined, ...fields }),
  };
  process.stdout.write(`${format(line)}\n`);
  if (level !== "debug" && shared.forwarder) {
    try {
      shared.forwarder(line, { alert: level === "error" && explicit?.alert !== false });
    } catch {
      // Monitoring must never break the request it describes.
    }
  }
}

export const log = {
  debug: (event: LogEvent, fields?: LogFields) => emit("debug", event, fields),
  info: (event: LogEvent, fields?: LogFields) => emit("info", event, fields),
  warn: (event: LogEvent, fields?: LogFields) => emit("warn", event, fields),
  error: (event: LogEvent, fields?: LogFields, context?: ExplicitContext) => emit("error", event, fields, context),
};

/** Adds the owner and wedding to every later line (and Sentry event) of the current request. */
export function identify(fields: { ownerId?: string; weddingId?: string }) {
  const context = storage.getStore();
  if (!context) return;
  if (isUuid(fields.ownerId)) context.ownerId = fields.ownerId;
  if (isUuid(fields.weddingId)) context.weddingId = fields.weddingId;
}

// The proxy overwrites x-request-id on every request except Next.js build assets, so this is never a client value.
async function currentRequestId() {
  try {
    const id = (await headers()).get("x-request-id");
    if (isUuid(id)) return id;
  } catch {
    // Outside a request (for example in unit tests) there are no headers.
  }
  return crypto.randomUUID();
}

/**
 * Runs one Server Action or Route Handler with a request context. Unexpected errors are logged once as
 * `<operation>.failed` and rethrown for Next.js error handling and Sentry (`onRequestError`). When the code logged
 * nothing itself, a local-only `<operation>.completed` debug line records the outcome and duration.
 */
export async function withLogging<T>(operation: LogOperation, route: LogRoute, fn: () => Promise<T>): Promise<T> {
  const context: RequestContext = { requestId: await currentRequestId(), route, start: Date.now(), logged: false };
  return storage.run(context, async () => {
    try {
      const result = await fn();
      if (!context.logged) emit("debug", `${operation}.completed`);
      return result;
    } catch (error) {
      unstable_rethrow(error);
      // Sentry records the exception itself through onRequestError, so this line does not raise a second alert.
      emit("error", `${operation}.failed`, { reason: errorReason(error) }, { alert: false });
      if (error && typeof error === "object") failures.set(error, { requestId: context.requestId, ownerId: context.ownerId });
      throw error;
    }
  });
}

/** The request context of an error already logged by `withLogging`, so it is not logged twice. */
export function loggedFailure(error: unknown) {
  return error && typeof error === "object" ? failures.get(error) : undefined;
}
