import { expect, test, type Page } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";

// Crawlers read a fresh document. After a client-side click from the indexable homepage, a slow browser can keep the
// homepage's robots tag in the head beside the new one, so check the served HTML instead of the navigated DOM.
async function servedRobots(page: Page, path: string) {
  const html = await (await page.request.get(path)).text();
  return [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map((match) => match[1]);
}

test("marketing leads to signup and accurately explains price, visibility and RSVP", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["cache-control"]).toMatch(/no-store|no-cache/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your wedding website,beautifully done.");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Sign in/ })).toHaveAttribute("href", "/account/sign-in");
  await expect(page.getByRole("link", { name: /Your workspace/ })).toHaveCount(0);
  await expect(page.locator(".price")).toContainText("£29");
  await expect(page.getByText("One private guest link for all your guests", { exact: true })).toBeVisible();
  await expect(page.getByText("Published until six months after your wedding date*", { exact: true })).toBeVisible();
  await page.getByText("Who can see our website?", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Once published, anyone with your guest link/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("homepage.png"), fullPage: true });
  for (const section of [".marketing-hero", ".theme-showcase", ".marketing-pricing", ".marketing-faq"]) {
    await page.locator(section).screenshot({ path: test.info().outputPath(`${section.slice(1)}.png`) });
  }
  const createLinks = page.getByRole("link", { name: "Create your save the date", exact: true });
  await expect(createLinks).toHaveCount(2);
  for (const link of await createLinks.all()) {
    await expect(link).toHaveAttribute("href", "/account/sign-up");
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await createLinks.first().click();
  await expect(page).toHaveURL(/\/account\/sign-up$/);
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(await servedRobots(page, "/account/sign-up")).toEqual(["noindex, nofollow"]);
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Sign in/ }).click();
  await expect(page).toHaveURL(/\/account\/sign-in$/);
});

test("all public examples use fictional content, working Details and noindex", async ({ page }) => {
  // Twelve themes, each with two full-page screenshots, against the development server.
  test.setTimeout(120_000);
  for (const { id: theme, name } of themes) {
    await page.goto("/#themes");
    await page.getByRole("link", { name: new RegExp(`${name}.*Explore this example`) }).click();
    await expect(page).toHaveURL(new RegExp(`/examples/${theme}$`));
    await expect(page.getByRole("link", { name: "Create your save the date" })).toHaveAttribute("href", "/account/sign-up");
    await expect(page.getByText("Fictional wedding example")).toBeVisible();
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("img")).toHaveJSProperty("naturalWidth", 1400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${theme}-example.png`), fullPage: true });
    await page.getByRole("link", { name: "Details", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Wedding details" })).toBeVisible();
    await expect(page.getByText(/fictional venue/)).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath(`${theme}-details.png`), fullPage: true });
    await page.getByRole("link", { name: "Save the date", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Save the Date" })).toBeVisible();
    await page.getByRole("link", { name: "All themes", exact: false }).click();
    await expect(page).toHaveURL(/\/#themes$/);
  }
  // Fetched together once every example has compiled, so the check adds little time.
  for (const robots of await Promise.all(themes.map(({ id }) => servedRobots(page, `/examples/${id}`)))) expect(robots).toEqual(["noindex, nofollow"]);
  expect((await page.goto("/examples/unknown"))?.status()).toBe(404);
  expect((await page.goto("/examples/minimal/rsvp"))?.status()).toBe(404);
});

test("search and social metadata use the configured origin and only market the homepage", async ({ page, request, baseURL }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Wedding websites, beautifully done/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", baseURL!);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", baseURL!);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const share = await request.get((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
  expect(share.status()).toBe(200);
  expect(share.headers()["content-type"]).toContain("image/png");
  const sitemap = await request.get("/sitemap.xml");
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(1);
  expect(xml).toContain(`<loc>${baseURL}</loc>`);
  expect(xml).not.toMatch(/dashboard|examples|demo|account/);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  const unknown = await page.goto("/unknown-marketing-test-wedding");
  expect(unknown?.status()).toBe(404);
  expect(await page.locator('meta[name="robots"]').first().getAttribute("content")).toContain("noindex");
});

test("homepage remains usable at 320px and reports local rendering measurements", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0 };
    Object.assign(window, { marketingMetrics: metrics });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) metrics.cls += shift.value; } }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("homepage-320.png"), fullPage: true });
  const metrics = await page.evaluate(() => ({ ...(window as unknown as { marketingMetrics: object }).marketingMetrics, transferBytes: performance.getEntriesByType("resource").reduce((total, entry) => total + (entry as PerformanceResourceTiming).transferSize, 0) }));
  console.log(`Local rendering (${test.info().project.name}; ${process.env.E2E_PRODUCTION ? "production" : "development"}; unthrottled): ${JSON.stringify(metrics)}`);
  for (const width of [701, 760, 761, 768, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`).toBe(true);
  }
});
