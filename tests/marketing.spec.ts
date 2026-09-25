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
  // Themes share one implementation; theme-design.spec.ts renders every example. Here every homepage card must link to
  // its example and every example must be noindex, then one example is walked through.
  await page.goto("/#themes");
  for (const { id, name } of themes) {
    await expect(page.getByRole("link", { name: new RegExp(`${name}.*Explore this example`) })).toHaveAttribute("href", `/examples/${id}`);
  }
  for (const robots of await Promise.all(themes.map(({ id }) => servedRobots(page, `/examples/${id}`)))) expect(robots).toEqual(["noindex, nofollow"]);
  const { id: theme, name } = themes[0];
  await page.getByRole("link", { name: new RegExp(`${name}.*Explore this example`) }).click();
  await expect(page).toHaveURL(new RegExp(`/examples/${theme}$`));
  await expect(page.getByRole("link", { name: "Create your save the date" })).toHaveAttribute("href", "/account/sign-up");
  await expect(page.getByText("Fictional wedding example")).toBeVisible();
  await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", theme);
  await expect(page.getByRole("img")).toHaveJSProperty("naturalWidth", 1400);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Details", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Wedding details" })).toBeVisible();
  await expect(page.getByText(/fictional venue/)).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  await page.getByRole("link", { name: "Save the date", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Save the Date" })).toBeVisible();
  await page.getByRole("link", { name: "All themes", exact: false }).click();
  await expect(page).toHaveURL(/\/#themes$/);
  expect((await page.goto("/examples/unknown"))?.status()).toBe(404);
  expect((await page.goto("/examples/minimal/rsvp"))?.status()).toBe(404);
});

async function structuredData(page: Page, path: string) {
  const html = await (await page.request.get(path)).text();
  return [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].flatMap((match) => JSON.parse(match[1]));
}

test("search and social metadata use the configured origin and only market public pages", async ({ page, request, baseURL }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Digital save the date & wedding website with RSVP | SaveTheDates");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", baseURL!);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", baseURL!);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const share = await request.get((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
  expect(share.status()).toBe(200);
  expect(share.headers()["content-type"]).toContain("image/png");
  expect(await structuredData(page, "/")).toEqual([
    { "@context": "https://schema.org", "@type": "WebSite", name: "SaveTheDates", url: `${baseURL}/` },
    { "@context": "https://schema.org", "@type": "Organization", name: "SaveTheDates", url: `${baseURL}/`, logo: `${baseURL}/icon-512.png` },
  ]);
  expect((await request.get("/icon-512.png")).status()).toBe(200);
  for (const path of ["/digital-save-the-date", "/examples/minimal", "/account/sign-in", "/unknown-marketing-test-wedding"]) expect(await structuredData(page, path), path).toEqual([]);
  const sitemap = await request.get("/sitemap.xml");
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(2);
  expect(xml).toContain(`<loc>${baseURL}</loc>`);
  expect(xml).toContain(`<loc>${baseURL}/digital-save-the-date</loc>`);
  expect(xml).not.toMatch(/dashboard|examples|demo|account/);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  const unknown = await page.goto("/unknown-marketing-test-wedding");
  expect(unknown?.status()).toBe(404);
  expect(await page.locator('meta[name="robots"]').first().getAttribute("content")).toContain("noindex");
});

test("the digital save the date page is indexable, accurate and linked from the homepage", async ({ page, baseURL }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Digital save the dates" }).click();
  await expect(page).toHaveURL(/\/digital-save-the-date$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Digital save the dates,with RSVP built in.");
  await expect(page).toHaveTitle("Digital save the date with online RSVP | SaveTheDates");
  expect(await servedRobots(page, "/digital-save-the-date")).toEqual(["index, follow"]);
  const served = await page.request.get("/digital-save-the-date");
  expect(served.headers()["x-robots-tag"]).toBeUndefined();
  expect(served.headers()["cache-control"]).toMatch(/no-store/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}/digital-save-the-date`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", `${baseURL}/digital-save-the-date`);
  const createLinks = page.getByRole("link", { name: "Create your save the date", exact: true });
  await expect(createLinks).toHaveCount(2);
  for (const link of await createLinks.all()) await expect(link).toHaveAttribute("href", "/account/sign-up");
  await expect(page.getByRole("link", { name: "See the twelve designs" })).toHaveAttribute("href", "/#themes");
  await expect(page.locator(".price")).toContainText("£29");
  await page.getByText("Can guests see each other’s replies?", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("No. Responses are visible only in your account.")).toBeVisible();
  for (const width of [320, 390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`).toBe(true);
    if (width === 390 || width === 1440) await page.screenshot({ path: test.info().outputPath(`digital-save-the-date-${width}.png`), fullPage: true });
  }
  await page.getByRole("link", { name: "See the twelve designs" }).click();
  await expect(page).toHaveURL(/\/#themes$/);
  await page.getByText("What is a digital save the date?", { exact: true }).click();
  await expect(page.getByRole("link", { name: "More about digital save the dates" })).toHaveAttribute("href", "/digital-save-the-date");
});

test("privacy, terms and refund pages are linked from the footer and beside sign-up", async ({ page, baseURL }) => {
  const pages = [
    { link: "Privacy", path: "/privacy", heading: "Privacy notice", text: "Google shares your name, email address and profile picture link" },
    { link: "Terms", path: "/terms", heading: "Terms of service", text: "you pay £29 once for one wedding site" },
    { link: "Refunds", path: "/refunds", heading: "Refund policy", text: "within 14 days of paying and get a full refund" },
  ];
  for (const { link, path, heading, text } of pages) {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Legal and contact" }).getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByText(text)).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "hello@savethedates.co.uk" }).first()).toHaveAttribute("href", "mailto:hello@savethedates.co.uk");
    expect(await servedRobots(page, path)).toEqual(["index, follow"]);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}${path}`);
  }
  await expect(page.getByRole("navigation", { name: "Legal and contact" }).getByRole("link", { name: /Contact/ })).toHaveAttribute("href", "mailto:hello@savethedates.co.uk");
  await page.goto("/account/sign-up");
  const agreement = page.getByText(/By creating an account.* you agree to our terms and refund policy/);
  await expect(agreement).toBeVisible();
  for (const [name, path] of [["terms", "/terms"], ["refund policy", "/refunds"], ["privacy notice", "/privacy"]]) {
    await expect(agreement.getByRole("link", { name, exact: true })).toHaveAttribute("href", path);
  }
  await page.goto("/account/sign-in");
  await expect(page.getByText(/By continuing with Google you agree to our terms/)).toBeVisible();
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
