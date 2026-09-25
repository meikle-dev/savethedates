import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, scrubLog, scrubText, scrubUrl } from "./scrub";

const secret = "Abc123_-xyzABC123_-xyzABC123_-xyzABC123_-x"; // 43 base64url characters, like a shared RSVP secret
const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlLXZhbHVl";
const ownerId = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("scrubUrl", () => {
  it("hides the shared RSVP secret and every query string", () => {
    expect(scrubUrl(`https://example.test/s/${secret}/alex-and-sam/rsvp`)).toBe("https://example.test/s/[secret]/alex-and-sam/rsvp");
    expect(scrubUrl(`/s/${secret}/alex-and-sam/rsvp?x=1`)).toBe("/s/[secret]/alex-and-sam/rsvp");
    expect(scrubUrl(`https://example.test/alex-and-sam?share=${secret}`)).toBe("https://example.test/alex-and-sam");
    expect(scrubUrl("/dashboard/guests?q=Sam%20Taylor#row")).toBe("/dashboard/guests");
    expect(scrubUrl("https://example.test/auth/confirm?token_hash=0a1b2c&type=recovery")).toBe("https://example.test/auth/confirm");
    expect(scrubUrl("http://127.0.0.1:54321/rest/v1/weddings?slug=eq.alex-and-sam&select=id")).toBe("http://127.0.0.1:54321/rest/v1/weddings");
  });
  it("drops credentials and keeps ordinary paths", () => {
    expect(scrubUrl("https://user:pass@example.test/dashboard")).toBe("https://example.test/dashboard");
    expect(scrubUrl("https://example.test/_next/static/chunks/app.js")).toBe("https://example.test/_next/static/chunks/app.js");
    expect(scrubUrl("http://s/example")).toBe("http://s/example");
    expect(scrubUrl("/s/[shareSecret]/[weddingSlug]/rsvp")).toBe("/s/[shareSecret]/[weddingSlug]/rsvp");
  });
});

describe("scrubText", () => {
  it("removes secrets, tokens and values from messages", () => {
    const message = scrubText(`Failed GET /s/${secret}/alex/rsvp?share=${secret} with Bearer ${jwt}; token_hash=deadbeef for guest@example.test`);
    expect(message).not.toContain(secret);
    expect(message).not.toContain(jwt);
    expect(message).not.toContain("deadbeef");
    expect(message).not.toContain("guest@example.test");
    expect(message).toContain("/s/[secret]/alex/rsvp");
  });
  it("hides values that Postgres echoes in error messages", () => {
    expect(scrubText('duplicate key value violates unique constraint "weddings_slug_key" Key (slug)=(alex-and-sam) already exists.'))
      .toBe('duplicate key value violates unique constraint "weddings_slug_key" Key (slug)=([redacted]) already exists.');
    expect(scrubText("Failing row contains (Sam Taylor, t, 2027-09-18).")).toBe("Failing row contains ([redacted]).");
    expect(scrubText('invalid input syntax for type uuid: "Sam Taylor"')).toBe('invalid input syntax for type uuid: "[redacted]"');
  });
  it("hides service keys and Supabase JWTs but keeps identifiers of code and events", () => {
    expect(scrubText("key sk_test_51abcDEF whsec_abc123 sb_secret_abc-123")).toBe("key [redacted] [redacted] [redacted]");
    expect(scrubText(`apikey ${jwt}`)).toBe("apikey [jwt]");
    expect(scrubText(`owner ${ownerId} release 3f5c2a9d0e1b4c7a8f6e5d4c3b2a19081726354a`)).toBe(`owner ${ownerId} release 3f5c2a9d0e1b4c7a8f6e5d4c3b2a19081726354a`);
    expect(scrubText(`secret ${secret}`)).toBe("secret [token]");
  });
});

describe("scrubEvent", () => {
  it("keeps only safe request data, the owner UUID and scrubbed messages", () => {
    const event = scrubEvent({
      message: `Oops at /dashboard/guests?q=Sam`,
      transaction: `POST /s/${secret}/alex/rsvp`,
      request: {
        method: "POST",
        url: `https://example.test/alex?share=${secret}`,
        query_string: `share=${secret}`,
        data: { responding_name: "Sam Taylor", secret },
        cookies: { "wedding-auth": jwt },
        headers: { Authorization: `Bearer ${jwt}`, Cookie: `wedding-auth=${jwt}`, Referer: `https://example.test/auth/confirm?token_hash=abc&type=signup`, "User-Agent": "Test", "Next-Action": "abc" },
      },
      user: { id: ownerId, email: "owner@example.test", ip_address: "203.0.113.1" },
      exception: { values: [{ type: "Error", value: `Key (responding_name)=(Sam Taylor) at https://example.test/s/${secret}/alex/rsvp`, stacktrace: { frames: [{ filename: `https://example.test/s/${secret}/alex/rsvp?share=1`, vars: { name: "Sam Taylor" } }] } }] },
      contexts: { nextjs: { request_path: `/alex?share=${secret}` }, trace: { trace_id: "0123456789abcdef0123456789abcdef" } },
      extra: { form: { responding_name: "Sam Taylor" }, note: `code=${secret}` },
      breadcrumbs: [{ category: "console", message: "Sam Taylor" }, { category: "fetch", data: { url: `/s/${secret}/alex/rsvp?_rsc=1`, method: "POST" } }],
    });
    const serialized = JSON.stringify(event);
    for (const value of [secret, jwt, "Sam Taylor", "owner@example.test", "203.0.113.1", "token_hash", "wedding-auth", "Next-Action"]) expect(serialized).not.toContain(value);
    expect(event.user).toEqual({ id: ownerId });
    expect(event.request).toEqual({ method: "POST", url: "https://example.test/alex", headers: { Referer: "https://example.test/auth/confirm", "User-Agent": "Test" } });
    expect(event.breadcrumbs).toEqual([{ category: "fetch", data: { url: "/s/[secret]/alex/rsvp", method: "POST" } }]);
    expect(event.contexts).toEqual({ nextjs: { request_path: "/alex" }, trace: { trace_id: "0123456789abcdef0123456789abcdef" } });
  });
  it("scrubs trace context data and truncates deeply nested values", () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { name: "Sam Taylor" } } } } } } } };
    const event = scrubEvent({
      contexts: { trace: { trace_id: "0123456789abcdef0123456789abcdef", data: { "url.full": `https://example.test/alex?share=${secret}`, cookie: jwt } } },
      extra: deep,
    });
    expect(event.contexts).toEqual({ trace: { trace_id: "0123456789abcdef0123456789abcdef", data: { "url.full": "https://example.test/alex" } } });
    expect(JSON.stringify(event.extra)).not.toContain("Sam Taylor");
    expect(JSON.stringify(event.extra)).toContain("[truncated]");
  });
  it("drops users that are not owner UUIDs", () => {
    expect(scrubEvent({ user: { id: "guest@example.test" } }).user).toBeUndefined();
  });
});

describe("scrubBreadcrumb and scrubLog", () => {
  it("drops DOM breadcrumbs, whose accessible names can contain guest names", () => {
    expect(scrubBreadcrumb({ category: "ui.click", message: 'button[aria-label="Correct or remove response from Sam Taylor"]' })).toBeNull();
    expect(scrubBreadcrumb({ category: "ui.input", message: "input[name=responding_name]" })).toBeNull();
    expect(scrubBreadcrumb({ category: "console", message: "Sam Taylor" })).toBeNull();
  });
  it("scrubs navigation and HTTP breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "navigation", data: { from: `/alex?share=${secret}`, to: `/s/${secret}/alex/rsvp` } }))
      .toEqual({ category: "navigation", data: { from: "/alex", to: "/s/[secret]/alex/rsvp" } });
    expect(scrubBreadcrumb({ category: "http", data: { url: "http://127.0.0.1:54321/rest/v1/rpc/submit_shared_rsvp", "http.query": "?slug=alex", method: "POST" } }))
      .toEqual({ category: "http", data: { url: "http://127.0.0.1:54321/rest/v1/rpc/submit_shared_rsvp", method: "POST" } });
  });
  it("scrubs log messages and attributes", () => {
    const log = scrubLog({ level: "warn", message: `rejected /s/${secret}/alex/rsvp`, attributes: { requestId: ownerId, cookie: jwt, url: `/alex?share=${secret}` } });
    expect(log).toEqual({ level: "warn", message: "rejected /s/[secret]/alex/rsvp", attributes: { requestId: ownerId, url: "/alex" } });
  });
});
