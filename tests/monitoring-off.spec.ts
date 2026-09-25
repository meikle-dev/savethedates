import { expect, test } from "@playwright/test";

// The main suite runs without SENTRY_DSN, as local development and CI do.
test("with monitoring unset, pages load no SDK and make no third-party requests", async ({ page, baseURL, request }) => {
  const config = await request.get("/api/runtime-config");
  expect(config.headers()["cache-control"]).toBe("no-store");
  expect(await config.json()).toEqual({ sentry: null });

  const origins = new Set<string>();
  page.on("request", (sent) => {
    if (/^https?:/.test(sent.url())) origins.add(new URL(sent.url()).origin);
  });
  for (const path of ["/", "/examples/minimal", "/account/sign-in"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => setTimeout(() => { throw new Error("e2e error with monitoring unset"); }));
  }
  await page.waitForTimeout(500);
  expect([...origins]).toEqual([new URL(baseURL!).origin]);
  expect(await page.evaluate(() => "__SENTRY__" in globalThis)).toBe(false);
});
