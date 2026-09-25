// One scrubber for everything that leaves the application: Sentry events, breadcrumbs, logs and the JSON logger.
// It runs in the browser and on the server, so it has no dependencies. See docs/operations.md (Monitoring).

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sensitiveKey = /^(authorization|proxy-authorization|cookies?|set-cookie|password|email|ip_address|x-forwarded-for|x-real-ip|stripe-signature|body|form|formdata|query_string|.*secret.*|.*token.*)$/i;
const allowedHeaders = new Set(["content-type", "host", "user-agent", "x-request-id"]);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

/** Drops query string, fragment and credentials, and hides the shared RSVP secret in `/s/<secret>/…`. */
export function scrubUrl(url: string): string {
  return url
    .replace(/[?#][\s\S]*$/, "")
    .replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, "$1")
    // Route templates such as /s/[shareSecret]/… are kept; real secrets never start with "[".
    .replace(/(^|[^/:])\/s\/(?!\[)[^/?#\s]+/g, "$1/s/[secret]");
}

/** Removes secrets and values from free text such as exception messages. */
export function scrubText(text: string): string {
  return text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[jwt]")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, (url) => scrubUrl(url))
    .replace(/(\/[^\s?#"'<>]*)\?[^\s"'<>]*/g, "$1")
    .replace(/(^|[\s"'(=,])\/s\/(?!\[)[^/?#\s"'<>]+/g, "$1/s/[secret]")
    .replace(/\b(token_hash|token|access_token|refresh_token|code|share|secret|password|q|type)=[^&\s"']+/gi, "$1=[redacted]")
    .replace(/\bBearer\s+[\w.~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|rk|pk)_(?:test|live)_[0-9A-Za-z]+|\bwhsec_[0-9A-Za-z]+|\bsb_(?:secret|publishable)_[\w-]+/g, "[redacted]")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .replace(/Key \(([^)]*)\)=\([^)]*\)/g, "Key ($1)=([redacted])")
    .replace(/Failing row contains \(.*?\)(?=\.|$)/g, "Failing row contains ([redacted])")
    .replace(/(for type [\w ]+: )"[^"]*"/g, '$1"[redacted]"')
    // Opaque tokens (invitation secrets are 43 base64url characters). Lower-case hex such as trace IDs,
    // commit SHAs and UUIDs is kept because it identifies code or events, not people.
    .replace(/(?<![\w-])[\w-]{32,}(?![\w-])/g, (token) => (/^[0-9a-f-]+$/.test(token) ? token : "[token]"));
}

/** Recursively scrubs strings and drops sensitive keys. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!sensitiveKey.test(key)) result[key] = scrubValue(item, depth + 1);
  }
  return result;
}

function scrubHeaders(headers: Record<string, unknown> | undefined) {
  if (!headers) return undefined;
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const key = name.toLowerCase();
    if (typeof value !== "string") continue;
    if (key === "referer") result[name] = scrubUrl(value);
    else if (allowedHeaders.has(key)) result[name] = scrubText(value);
  }
  return result;
}

type Frame = { filename?: string; abs_path?: string; vars?: unknown };
type RequestData = { url?: string; method?: string; headers?: Record<string, unknown> };
type Breadcrumb = { category?: string; message?: string; data?: Record<string, unknown> };
type Event = {
  message?: string;
  transaction?: string;
  request?: RequestData;
  user?: { id?: unknown };
  logentry?: { message?: string };
  exception?: { values?: Array<{ value?: string; stacktrace?: { frames?: Frame[] } }> };
  breadcrumbs?: Breadcrumb[];
  tags?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
};
type Log = { message?: unknown; attributes?: Record<string, unknown> };

// The generic signatures accept Sentry's own event, breadcrumb and log types unchanged.
export function scrubBreadcrumb<B>(breadcrumb: B): B | null {
  const result = { ...(breadcrumb as Breadcrumb) };
  // Console and DOM (ui.click, ui.input) breadcrumbs can carry names and values; they are off, and dropped here too.
  if (result.category === "console" || result.category?.startsWith("ui.")) return null;
  if (typeof result.message === "string") result.message = scrubText(result.message);
  if (result.data) {
    const data = scrubValue(result.data) as Record<string, unknown>;
    for (const key of ["url", "from", "to"]) if (typeof result.data[key] === "string") data[key] = scrubUrl(result.data[key] as string);
    for (const key of ["http.query", "http.fragment", "query", "body", "request_body", "response_body"]) delete data[key];
    result.data = data;
  }
  return result as B;
}

export function scrubEvent<E>(event: E): E {
  const result = { ...(event as Event) };
  if (result.request) {
    const { url, method, headers } = result.request;
    result.request = { method, url: typeof url === "string" ? scrubUrl(url) : undefined, headers: scrubHeaders(headers) };
  }
  if (result.user) result.user = isUuid(result.user.id) ? { id: result.user.id } : undefined;
  if (typeof result.message === "string") result.message = scrubText(result.message);
  if (typeof result.transaction === "string") result.transaction = scrubText(result.transaction);
  if (result.logentry) result.logentry = { message: typeof result.logentry.message === "string" ? scrubText(result.logentry.message) : undefined };
  if (result.exception?.values) {
    result.exception = {
      ...result.exception,
      values: result.exception.values.map((exception) => ({
        ...exception,
        value: typeof exception.value === "string" ? scrubText(exception.value) : exception.value,
        stacktrace: exception.stacktrace && {
          ...exception.stacktrace,
          frames: exception.stacktrace.frames?.map((frame) => ({
            ...frame,
            vars: undefined,
            filename: frame.filename && scrubUrl(frame.filename),
            abs_path: frame.abs_path && scrubUrl(frame.abs_path),
          })),
        },
      })),
    };
  }
  if (result.breadcrumbs) result.breadcrumbs = result.breadcrumbs.map((crumb) => scrubBreadcrumb(crumb)).filter((crumb) => crumb !== null);
  if (result.tags) result.tags = scrubValue(result.tags) as Record<string, unknown>;
  if (result.extra) result.extra = scrubValue(result.extra) as Record<string, unknown>;
  if (result.contexts) {
    // The trace context keeps its IDs (lower-case hex survives scrubbing) but its data is scrubbed like the rest.
    const { trace, ...contexts } = result.contexts as { trace?: { data?: unknown } };
    result.contexts = { ...(scrubValue(contexts) as Record<string, unknown>), ...(trace ? { trace: { ...trace, ...(trace.data ? { data: scrubValue(trace.data) } : {}) } } : {}) };
  }
  return result as E;
}

export function scrubLog<L>(log: L): L {
  const { message, attributes } = log as Log;
  return {
    ...log,
    message: typeof message === "string" ? scrubText(message) : message,
    attributes: attributes && (scrubValue(attributes) as Record<string, unknown>),
  };
}
