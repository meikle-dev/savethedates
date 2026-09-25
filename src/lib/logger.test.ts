import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestId = "7d444840-9dc0-41d2-a0f3-b09b0f5c8a1e";
const ownerId = "0f8fad5b-d9cb-469f-a165-70867728950e";
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-request-id": requestId }) }));

const { errorReason, forwardLogs, identify, log, loggedFailure, withLogging } = await import("./logger");
const { redirect } = await import("next/navigation");

let output: string[];
function lines() {
  return output.map((line) => JSON.parse(line) as Record<string, unknown>);
}

beforeEach(() => {
  output = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    output.push(String(chunk).trimEnd());
    return true;
  });
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SENTRY_ENVIRONMENT", "staging");
  vi.stubEnv("APP_RELEASE", "abc123");
});
afterEach(() => {
  forwardLogs(undefined);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("writes one JSON line with the standard fields in production", () => {
    log.warn("payment.webhook.rejected", { reason: "invalid_signature" });
    expect(output).toHaveLength(1);
    const [line] = lines();
    expect(Object.keys(line).sort()).toEqual(["environment", "event", "level", "reason", "release", "requestId", "route", "timestamp"]);
    expect(line).toMatchObject({ level: "warn", event: "payment.webhook.rejected", environment: "staging", release: "abc123", requestId: "none", route: "unknown", reason: "invalid_signature" });
    expect(new Date(line.timestamp as string).toISOString()).toBe(line.timestamp);
  });

  it("keeps only allow-listed, well-formed fields", () => {
    log.info("rsvp.submit.accepted", {
      ownerId, weddingId: "not-a-uuid", reason: "Sam Taylor said no", stripeEventId: "evt_123", count: 2.4,
      ...({ email: "guest@example.test", url: "/alex?share=secret", name: "Sam Taylor" } as object),
    });
    const [line] = lines();
    expect(line).toMatchObject({ ownerId, reason: "invalid_reason", stripeEventId: "evt_123", count: 2 });
    expect(JSON.stringify(line)).not.toMatch(/guest@example|share=|Sam Taylor|not-a-uuid/);
  });

  it("drops debug lines in production and prints readable debug lines locally", () => {
    log.debug("rsvp.submit.completed");
    expect(output).toEqual([]);
    vi.stubEnv("NODE_ENV", "development");
    log.debug("rsvp.submit.completed", { durationMs: 12 });
    expect(output).toHaveLength(1);
    expect(output[0]).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} DEBUG rsvp\.submit\.completed req=none route=unknown durationMs=12$/);
  });

  it("forwards non-debug lines and raises alerts only for errors", () => {
    const forwarded: Array<[string, boolean]> = [];
    forwardLogs((line, { alert }) => forwarded.push([line.event, alert]));
    log.info("rsvp.link.rotated");
    log.warn("rsvp.submit.rejected", { reason: "closed" });
    log.error("payment.webhook.failed", { reason: "PGRST301" });
    expect(forwarded).toEqual([["rsvp.link.rotated", false], ["rsvp.submit.rejected", false], ["payment.webhook.failed", true]]);
  });

  it("describes errors by code or class, never by message", () => {
    expect(errorReason(Object.assign(new Error("Key (slug)=(alex)"), { code: "23505" }))).toBe("23505");
    expect(errorReason(new TypeError("guest@example.test"))).toBe("TypeError");
    expect(errorReason("boom")).toBe("unknown");
  });
});

describe("withLogging", () => {
  it("adds request context to lines and logs nothing extra when the code logged its outcome", async () => {
    const result = await withLogging("rsvp.submit", "/[names]/[secret]/rsvp", async () => {
      identify({ ownerId });
      log.info("rsvp.submit.accepted");
      return "saved";
    });
    expect(result).toBe("saved");
    expect(lines()).toEqual([expect.objectContaining({ event: "rsvp.submit.accepted", requestId, ownerId, route: "/[names]/[secret]/rsvp", durationMs: expect.any(Number) })]);
  });

  it("records one local completion line when the code logged nothing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await withLogging("workspace.save", "/dashboard/basics", async () => undefined);
    expect(output).toHaveLength(1);
    expect(output[0]).toContain("DEBUG workspace.save.completed req=7d444840 route=/dashboard/basics durationMs=");
  });

  it("logs an unexpected failure exactly once, rethrows it and marks it as logged", async () => {
    const forwarded: Array<[string, boolean]> = [];
    forwardLogs((line, { alert }) => forwarded.push([line.event, alert]));
    const failure = new TypeError("Cannot read guest@example.test");
    await expect(withLogging("payment.webhook", "/api/stripe/webhook", async () => {
      identify({ ownerId });
      throw failure;
    })).rejects.toBe(failure);
    expect(lines()).toEqual([expect.objectContaining({ level: "error", event: "payment.webhook.failed", reason: "TypeError", requestId, ownerId })]);
    expect(forwarded).toEqual([["payment.webhook.failed", false]]);
    expect(loggedFailure(failure)).toEqual({ requestId, ownerId });
  });

  it("lets Next.js navigation errors through without logging them", async () => {
    await expect(withLogging("account.signin", "/account/[screen]", async () => redirect("/dashboard"))).rejects.toThrow("NEXT_REDIRECT");
    expect(output).toEqual([]);
  });
});
