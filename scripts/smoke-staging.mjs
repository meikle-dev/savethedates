import assert from "node:assert/strict";

// Checks a server started with APP_ENV=staging and the same STAGING_USERNAME/STAGING_PASSWORD as this process.
// Usage: node scripts/smoke-staging.mjs [origin]. Commands: run-app-instructions.md (Staging access check).
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const { STAGING_USERNAME: username, STAGING_PASSWORD: password } = process.env;
assert.ok(username && password, "Set STAGING_USERNAME and STAGING_PASSWORD to the server's values");
const authorization = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
const signedIn = { authorization: authorization(username, password) };
const get = (path, headers = {}) => fetch(new URL(path, base), { headers, redirect: "manual" });
const assertNoindex = (response, path) => assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/, `${path} must be noindex`);

// /media/themes/rsvp matches the guest RSVP route (names "media", secret "themes"); only the theme image files are open.
for (const path of ["/digital-save-the-date", "/account/sign-in", "/dashboard", "/robots.txt", "/favicon.ico", `/unknown-wedding/${"x".repeat(43)}`, "/media/themes/rsvp", "/privacy/x"]) {
  for (const headers of [{}, { authorization: authorization(username, `${password}-wrong`) }]) {
    const response = await get(path, headers);
    assert.equal(response.status, 401, `${path} must require the staging password`);
    assert.match(response.headers.get("www-authenticate") ?? "", /^Basic /);
    assertNoindex(response, path);
    assert.equal(await response.text(), "Authentication required.");
  }
}

// Google's OAuth consent screen needs a reachable homepage and privacy policy; these hold no private data.
for (const path of ["/", "/privacy", "/terms", "/refunds"]) {
  const response = await get(path);
  assert.equal(response.status, 200, `${path} must open without the staging password`);
  assertNoindex(response, path);
}

const home = await get("/");
const html = await home.text();

const robots = await get("/robots.txt", signedIn);
assert.equal(robots.status, 200);
const rules = await robots.text();
assert.match(rules, /Disallow: \/\s*$/m);
assert.doesNotMatch(rules, /Allow:|Sitemap:/);

const health = await get("/api/health");
assert.equal(health.status, 200, "The health check must answer without credentials");
assert.equal(await health.text(), "ok");

const webhook = await fetch(new URL("/api/stripe/webhook", base), { method: "POST", body: "{}" });
assert.equal(webhook.status, 400, "The webhook must reach its signature check, not the staging password");
assertNoindex(webhook, "/api/stripe/webhook");

// next/image fetches these internally without the browser's credentials; the homepage's optimised images must load.
const optimised = html.match(/\/_next\/image\?url=%2Fmedia%2Fthemes%2F[^"&]+&amp;w=\d+&amp;q=\d+/)?.[0].replaceAll("&amp;", "&");
assert.ok(optimised, "The homepage must use an optimised theme image");
const image = await get(optimised, signedIn);
assert.equal(image.status, 200, `${optimised} must load on staging`);
assert.match(image.headers.get("content-type") ?? "", /^image\//);

console.log(`Staging smoke passed: ${base} (password required and noindex everywhere; health, webhook, theme images, homepage and legal pages open)`);
