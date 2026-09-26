import { expect, test, type Frame, type Page } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";

// F070: the showcase page. Its phones are same-origin frames of the fictional example pages.
async function servedRobots(page: Page, path: string) {
  const html = await (await page.request.get(path)).text();
  return [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map((match) => match[1]);
}

const phoneSources = (page: Page) => page.locator(".offer-phone iframe").evaluateAll((frames) => frames.map((frame) => frame.getAttribute("src")));

async function rsvpFrame(page: Page): Promise<Frame> {
  const element = page.locator(".offer-phone-interactive iframe");
  await element.scrollIntoViewIfNeeded();
  await expect(element).toHaveAttribute("data-shown", "true");
  const frame = await element.elementHandle().then((handle) => handle!.contentFrame());
  await frame!.waitForLoadState();
  await expect(frame!.locator(".rsvp-card form")).toBeVisible();
  return frame!;
}

test("the homepage leads to an indexable What we offer page", async ({ page, baseURL }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "See everything we offer" })).toHaveCount(2);
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "What we offer" })).toHaveAttribute("href", "/what-we-offer");
  await page.getByRole("link", { name: "See everything we offer" }).first().click();
  await expect(page).toHaveURL(/\/what-we-offer$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Everything your guests need,in the design you love.");
  await expect(page).toHaveTitle("What we offer: wedding website, invitation & RSVP with meal choices | SaveTheDates");
  expect(await servedRobots(page, "/what-we-offer")).toEqual(["index, follow"]);
  const served = await page.request.get("/what-we-offer");
  expect(served.headers()["x-robots-tag"]).toBeUndefined();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}/what-we-offer`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${baseURL}/media/share?page=offer`);
  expect((await page.request.get("/media/share?page=offer")).headers()["content-type"]).toBe("image/png");
  for (const path of ["/what-we-offer/phone/minimal", "/what-we-offer/phone/velvet/rsvp"]) expect(await servedRobots(page, path)).toEqual(["noindex, nofollow"]);
  expect((await page.request.get("/what-we-offer/phone/not-a-theme")).status()).toBe(404);
  expect((await page.request.get("/what-we-offer/phone/minimal/nope")).status()).toBe(404);
  await expect(page.getByRole("link", { name: "Start building for free" }).first()).toHaveAttribute("href", "/account/sign-up");
});

test("one design switcher re-skins every phone", async ({ page }) => {
  await page.goto("/what-we-offer");
  const switcher = page.getByRole("group", { name: /Design/ });
  await expect(switcher.getByRole("radio")).toHaveCount(themes.length);
  await expect(switcher.getByRole("radio", { name: "Modern Minimal" })).toBeChecked();
  expect(await phoneSources(page)).toEqual(["/what-we-offer/phone/minimal", "/what-we-offer/phone/minimal/invitation", "/what-we-offer/phone/minimal/details", "/what-we-offer/phone/minimal/rsvp"]);
  // Keyboard: arrow keys move through the radio group.
  await switcher.getByRole("radio", { name: "Modern Minimal" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(switcher.getByRole("radio", { name: "Warm & Romantic" })).toBeChecked();
  for (const { id, name } of [themes[2], themes[9], themes[11]]) {
    await switcher.getByRole("radio", { name }).check();
    expect(await phoneSources(page)).toEqual([`/what-we-offer/phone/${id}`, `/what-we-offer/phone/${id}/invitation`, `/what-we-offer/phone/${id}/details`, `/what-we-offer/phone/${id}/rsvp`]);
    await expect(page.getByRole("link", { name: `See the full Invitation in ${name}` })).toHaveAttribute("href", `/examples/${id}/invitation`);
  }
  const first = page.locator(".offer-phone iframe").first();
  await expect(first).toHaveAttribute("data-shown", "true");
  expect(await first.evaluate((frame: HTMLIFrameElement) => frame.contentDocument!.querySelector(".wedding-shell")!.getAttribute("data-theme"))).toBe(themes[11].id);
});

test("replying as a guest updates the couple's side without any network request", async ({ page }) => {
  await page.goto("/what-we-offer");
  const frame = await rsvpFrame(page);
  const couple = page.locator(".offer-couple");
  await expect(couple.locator(".offer-couple-totals")).toContainText("5 attending");
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await frame.getByLabel("Your name").fill("Jo Example");
  await frame.getByText("Joyfully accepts").click();
  await frame.getByText("Leek and potato soup").click();
  await frame.getByText("Wild mushroom risotto").click();
  await frame.getByText("Sticky toffee pudding").click();
  await frame.getByText("Vegan", { exact: true }).click();
  await expect(couple.locator("li[data-new]")).toContainText("Jo Example");
  await expect(couple.locator("li[data-new]")).toContainText("Attending");
  await expect(couple.locator("li[data-new]")).toContainText("Wild mushroom risotto");
  await expect(couple.locator(".offer-couple-totals")).toContainText("6 attending");
  await expect(couple.locator(".offer-catering div", { hasText: "Wild mushroom risotto" }).locator("dd").last()).toHaveText("2");
  await expect(couple.locator(".offer-catering div", { hasText: /^Vegan/ }).locator("dd")).toHaveText("1");
  await expect(couple.locator('[aria-live="polite"]')).toContainText("Jo Example: attending.");
  await frame.getByText("Regretfully declines").click();
  await expect(couple.locator(".offer-couple-totals")).toContainText("5 attending");
  await expect(couple.locator(".offer-couple-totals")).toContainText("2 not attending");
  await expect(frame.getByRole("button", { name: /Send RSVP/ })).toBeDisabled();
  await expect(frame.getByText("Example only. Nothing you enter here is sent or saved.")).toBeVisible();
  expect(requests).toEqual([]);
});

test("the page reads fully and switches design without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/what-we-offer");
  for (const heading of ["Save the Date", "Wedding invitation", "Details of the day", "RSVP, with meal choices", "Every reply, in one place", "Simple to share. Private to you."]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.locator(".offer-couple")).toContainText("Amelia Hart");
  await page.getByRole("radio", { name: "Velvet" }).check();
  await page.getByRole("button", { name: "Show this design" }).click();
  await expect(page).toHaveURL(/\/what-we-offer\?theme=velvet#showcase$/);
  expect(await phoneSources(page)).toContain("/what-we-offer/phone/velvet/rsvp");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/what-we-offer$/);
  await context.close();
});

test("the showcase fits every width with no sideways scrolling, and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/what-we-offer");
  expect(await page.locator(".offer-phone iframe").first().evaluate((frame) => getComputedStyle(frame).transitionDuration)).toBe("0s");
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`).toBe(true);
  }
});
