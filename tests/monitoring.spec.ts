// Runs with playwright.monitoring.config.ts: the server gets a fake Sentry DSN that points at the local ingest
// below, so no payload leaves the machine. Asserts what Sentry would receive contains no secrets or form values.
import { createServer, type Server } from "node:http";
import { writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

const dsn = new URL(process.env.E2E_SENTRY_DSN ?? "http://e2epublickey@127.0.0.1:3199/1");
const local = localSupabase();
const received: Array<{ from: "browser" | "server"; body: string }> = [];
let ingest: Server;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  ingest = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      received.push({ from: "server", body: (request.headers["content-encoding"] === "gzip" ? gunzipSync(body) : body).toString("utf8") });
      response.writeHead(200, { "Content-Type": "application/json" }).end("{}");
    });
  });
  await new Promise<void>((resolve) => ingest.listen(Number(dsn.port), "0.0.0.0", resolve));
});
test.afterAll(() => new Promise<void>((resolve) => ingest.close(() => resolve())));

test.beforeEach(async ({ context }) => {
  // Browser envelopes are captured here and never sent anywhere.
  await context.route((url) => url.port === dsn.port && url.pathname.endsWith("/envelope/"), async (route) => {
    received.push({ from: "browser", body: route.request().postData() ?? "" });
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
});

async function monitoringReady(page: Page) {
  await page.waitForFunction(() => "__SENTRY__" in globalThis);
}

async function throwInBrowser(page: Page, marker: string) {
  await monitoringReady(page);
  await page.evaluate((text) => setTimeout(() => { throw new Error(`${text} at ${location.href}`); }), marker);
  await expect.poll(() => received.some(({ from, body }) => from === "browser" && body.includes(marker)), { timeout: 15_000 }).toBe(true);
}

function waitForServerLog(event: string, requestId?: string | null) {
  return expect.poll(() => received.some(({ from, body }) => from === "server" && body.includes(event) && (!requestId || body.includes(requestId))), {
    timeout: 30_000,
    message: `Expected Sentry log ${event}${requestId ? ` for request ${requestId}` : ""}`,
  }).toBe(true);
}

test("prebuilt pages read monitoring configuration at runtime", async ({ page, request }) => {
  const config = await request.get("/api/runtime-config");
  expect(config.headers()["cache-control"]).toBe("no-store");
  const { sentry } = await config.json();
  expect(sentry?.dsn, "Start the server with SENTRY_DSN=E2E_SENTRY_DSN (see run-app-instructions.md)").toBe(dsn.href);
  // /examples/minimal is prerendered at build time; it must still use this environment's DSN.
  const before = received.length;
  await page.goto("/examples/minimal");
  await monitoringReady(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_000);
  // A normal page view sends nothing to Sentry (no session tracking); only errors are reported.
  expect(received.slice(before), "No Sentry request on a page view").toEqual([]);
  await throwInBrowser(page, "e2e-static-page-error");
  const event = received.find(({ body }) => body.includes("e2e-static-page-error"))!.body;
  expect(event).toContain(`"release":"${sentry.release}"`);
  expect(event).toContain(`"environment":"${sentry.environment}"`);
});

test("shared-link RSVP, auth confirmation and checkout return send no secrets or form values", async ({ page, request }) => {
  test.setTimeout(180_000);
  const email = `monitoring-e2e-${crypto.randomUUID()}@example.test`;
  const password = `Pw-${crypto.randomUUID()}`;
  const slug = `monitoring-e2e-${crypto.randomUUID().slice(0, 8)}`;
  const guestName = `Quentin Fairweather ${crypto.randomUUID().slice(0, 6)}`;
  const signup = await local.admin.auth.admin.generateLink({ type: "signup", email, password });
  if (signup.error || !signup.data.user) throw new Error("Cannot create monitoring test owner");
  const ownerId = signup.data.user.id;
  const tokenHash = signup.data.properties.hashed_token;
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, rsvp_enabled: true }).select("id, rsvp_share_secret").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    const secret = wedding.data!.rsvp_share_secret as string;

    // Auth confirmation: the token hash is in the query string.
    const confirmed = page.waitForResponse((response) => response.url().includes("/auth/confirm"));
    await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=signup`);
    const confirmRequestId = (await confirmed).headers()["x-request-id"];
    await expect(page).toHaveURL(/\/dashboard/);
    await waitForServerLog("account.confirm.succeeded", confirmRequestId);

    // Guest journey through the guest link: the landing page, then its RSVP page, both under /<names>/<secret>/.
    await page.context().clearCookies();
    await page.goto(`/${slug}/${secret}`);
    await throwInBrowser(page, "e2e-share-landing-error");
    await page.getByRole("link", { name: "RSVP" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${slug}/${secret}/rsvp$`));
    await page.getByLabel("Your name").fill(guestName);
    await page.getByLabel("Joyfully accepts").check();
    const submitted = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes(`/${secret}/`));
    await page.getByRole("button", { name: "Send RSVP" }).click();
    const rsvpRequestId = (await submitted).headers()["x-request-id"];
    await expect(page.getByRole("status")).toContainText(guestName);
    await throwInBrowser(page, "e2e-shared-rsvp-error");
    await waitForServerLog("rsvp.submit.accepted", rsvpRequestId);

    // Owner: sign-in form values, checkout return, guest search, and clicks on controls named after the guest.
    await page.context().clearCookies();
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/dashboard/publish?checkout=success");
    await throwInBrowser(page, "e2e-checkout-return-error");
    await page.goto(`/dashboard/guests?q=${encodeURIComponent(guestName)}`);
    await monitoringReady(page);
    await page.getByRole("button", { name: `Correct or remove response from ${guestName}` }).click();
    await page.getByLabel("Responding name").fill(`${guestName} Junior`);
    await throwInBrowser(page, "e2e-guest-search-error");

    // A rejected Stripe webhook is a warning log with its request ID.
    const webhook = await request.post("/api/stripe/webhook", { headers: { "stripe-signature": "t=1,v1=invalid" }, data: "{}" });
    expect(webhook.status()).toBe(400);
    await waitForServerLog("payment.webhook.rejected", webhook.headers()["x-request-id"]);

    const everything = received.map(({ body }) => body).join("\n");
    await writeFile(test.info().outputPath("sentry-payloads.txt"), everything);
    for (const value of [secret, encodeURIComponent(secret), secret.slice(0, 20), tokenHash, guestName, encodeURIComponent(guestName), email, password, "wedding-auth", "?share=", "token_hash=", "checkout=success"]) {
      expect(everything, `Sentry payloads must not contain ${value}`).not.toContain(value);
    }
    expect(everything).toContain(`/${slug}/[secret]`);
  } finally {
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
