import { expect, test, type Page } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

async function observeMotion(page: Page, unsupported = false) {
  await page.addInitScript((unsupported) => {
    const log: { name: string; duration: number; properties: string[] }[] = [];
    const reveals: string[] = [];
    Object.assign(window, { motionLog: log, reveals });
    const record = (event: Event) => {
      const target = event.target as Element;
      for (const selector of ["details[open] > p", ".ws-nav ul[data-open]", ".guest-panel form", ".form-notice", ".field-error"]) {
        if (target.matches(selector)) reveals.push(selector);
      }
    };
    document.addEventListener("animationstart", record);
    document.addEventListener("transitionrun", record);
    if (unsupported) {
      // Without the Web Animations API, navigation must stay instant.
      Object.defineProperty(Element.prototype, "animate", { value: undefined });
      return;
    }
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<typeof animate>) {
      const animation = animate.apply(this, args);
      const effect = animation.effect as KeyframeEffect;
      log.push({ name: this.tagName, duration: Number(effect.getTiming().duration), properties: [...new Set(effect.getKeyframes().flatMap((frame) => Object.keys(frame).filter((key) => !["offset", "computedOffset", "easing", "composite"].includes(key))))] });
      if ((window as unknown as { pauseMotion: boolean }).pauseMotion) animation.pause();
      return animation;
    };
  }, unsupported);
}

const log = (page: Page) => page.evaluate(() => (window as unknown as { motionLog: { name: string; duration: number; properties: string[] }[] }).motionLog);
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

test("navigation fades live content without initial motion and disclosures remain keyboard accessible", async ({ page }) => {
  await observeMotion(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "true");
  expect(await log(page)).toEqual([]);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const question = page.getByText("Can we try it before paying?", { exact: true });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(question.locator("..")).toHaveAttribute("open", "");
  await expect.poll(() => page.evaluate(() => (window as unknown as { reveals: string[] }).reveals)).toContain("details[open] > p");
  await page.keyboard.press("Enter");
  await expect(question.locator("..")).not.toHaveAttribute("open");
  await page.evaluate(() => Object.assign(window, { pauseMotion: true }));
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Sign in/ }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect.poll(async () => (await log(page)).length).toBeGreaterThan(0);
  const animations = await log(page);
  expect(animations.some((animation) => animation.name === "MAIN")).toBe(true);
  for (const animation of animations) {
    expect(animation.duration).toBeLessThanOrEqual(250);
    expect(animation.properties.every((property) => ["opacity", "transform"].includes(property))).toBe(true);
  }
  // A paused fade makes real pointer hit testing deterministic.
  expect(await page.locator("main").evaluate((main) => main.getAnimations().some((a) => a.playState === "paused"))).toBe(true);
  const field = (await page.getByLabel("Email address").boundingBox())!;
  await page.mouse.click(field.x + field.width / 2, field.y + field.height / 2);
  await expect(page.getByLabel("Email address")).toBeFocused();
  await page.keyboard.type("motion@example.test");
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Media query change events fire at the next rendering step, after emulateMedia resolves.
  await expect.poll(() => page.locator("main").evaluate((main) => main.getAnimations().length)).toBe(0);
  await page.evaluate(() => Object.assign(window, { pauseMotion: false }));
  await expect(page.getByLabel("Email address")).toHaveValue("motion@example.test");
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath("account.png"), fullPage: true });
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your wedding website");
});

test("all twelve themes navigate with the same motion and stationary headers", async ({ page }) => {
  test.setTimeout(120_000);
  await observeMotion(page);
  for (const { id } of themes) {
    await page.goto(`/examples/${id}`);
    await page.getByRole("link", { name: "Details", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Wedding details" })).toBeVisible();
    await expect.poll(async () => (await log(page)).some((animation) => animation.name === "MAIN")).toBe(true);
    // The fade targets <main>, so headers outside it stay steady.
    expect(await page.locator(".wedding-header").evaluate((header) => !document.querySelector("main")!.contains(header))).toBe(true);
    await noOverflow(page);
    await page.getByRole("link", { name: "Save the date", exact: true }).click();
    await expect(page.locator(".wedding-hero")).toBeVisible();
    if (id === "minimal") await page.screenshot({ path: test.info().outputPath("wedding.png"), fullPage: true });
  }
});

for (const mode of ["reduced", "unsupported"] as const) {
  test(`${mode} motion keeps navigation and controls usable`, async ({ page }) => {
    if (mode === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
    await observeMotion(page, mode === "unsupported");
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Sign in/ }).click();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page).toHaveURL(/\/account\/recovery$/);
    await page.getByLabel("Email address").fill("motion@example.test");
    expect(await page.locator("main").evaluate((main) => main.getAnimations().length)).toBe(0);
    if (mode === "reduced") {
      expect(await log(page)).toEqual([]);
      expect(await page.locator("button").first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
    }
    await noOverflow(page);
  });
}

test("server-rendered notices have no initial animation", async ({ page }) => {
  await page.addInitScript(() => {
    const initialMotion: string[] = [];
    Object.assign(window, { initialMotion });
    document.addEventListener("transitionrun", (event) => initialMotion.push((event.target as Element).className));
    document.addEventListener("animationstart", (event) => initialMotion.push((event.target as Element).className));
  });
  await page.goto("/account/recovery?error=expired");
  await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "true");
  await expect(page.locator(".form-error[role=alert]")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { initialMotion: string[] }).initialMotion)).toEqual([]);
});

test("workspace keeps its shell, menu and correction controls usable with normal and reduced motion", async ({ page }) => {
  test.setTimeout(90_000);
  const local = localSupabase();
  const email = `motion-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const ownerId = created.data.user!.id;
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" }).select("id").single();
    expect(wedding.error).toBeNull();
    expect((await local.admin.from("shared_rsvp_responses").insert({ wedding_id: wedding.data!.id, responding_name: "Test Guest", attending: true })).error).toBeNull();
    await observeMotion(page);
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.evaluate(() => Object.assign(window, { originalHeader: document.querySelector(".ws-top") }));
    for (const reduced of [false, true]) {
      await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
      await page.evaluate(() => { (window as unknown as { reveals: string[] }).reveals.length = 0; });
      await openWorkspaceSection(page, "Basics");
      await expect(page).toHaveURL(/\/dashboard\/basics$/);
      expect(await page.evaluate(() => document.querySelector(".ws-top") === (window as unknown as { originalHeader: Element }).originalHeader)).toBe(true);
      expect(await page.locator(".ws-top").evaluate((header) => !document.querySelector("main")!.contains(header))).toBe(true);
      if (page.viewportSize()!.width < 768) {
        const toggle = page.getByRole("button", { name: "Sections" });
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        if (!reduced) await expect.poll(() => page.evaluate(() => (window as unknown as { reveals: string[] }).reveals)).toContain(".ws-nav ul[data-open]");
        await page.keyboard.press("Escape");
        await expect(toggle).toBeFocused();
        await expect(page.getByRole("navigation", { name: "Workspace sections" }).getByRole("link")).toHaveCount(0);
      }
      await openWorkspaceSection(page, "Guests");
      await expect(page).toHaveURL(/\/dashboard\/guests$/);
      const correction = page.getByRole("button", { name: "Correct or remove response from Test Guest" });
      await correction.click();
      const field = page.getByLabel("Responding name", { exact: true });
      await expect(field).toBeVisible();
      if (!reduced) await expect.poll(() => page.evaluate(() => (window as unknown as { reveals: string[] }).reveals)).toContain(".guest-panel form");
      await field.fill("Corrected Guest");
      await page.getByRole("button", { name: "Save correction", exact: true }).click();
      await expect(page.locator(".guest-name")).toHaveText("Corrected Guest", { timeout: 15_000 });
      if (!reduced) await expect.poll(() => page.evaluate(() => (window as unknown as { reveals: string[] }).reveals)).toContain(".form-notice");
      const close = page.getByRole("button", { name: "Correct or remove response from Corrected Guest" });
      await close.click();
      await expect(field).toBeHidden();
      await noOverflow(page);
      await page.screenshot({ path: test.info().outputPath(`workspace-${reduced ? "reduced" : "normal"}.png`), fullPage: true });
      // Restore the fixture through the visible correction form for the second pass.
      await close.click();
      await field.fill("Test Guest");
      await page.getByRole("button", { name: "Save correction", exact: true }).click();
      await expect(page.locator(".guest-name")).toHaveText("Test Guest", { timeout: 15_000 });
      if (reduced) expect(await page.evaluate(() => (window as unknown as { reveals: string[] }).reveals)).toEqual([]);
    }
    await page.setViewportSize({ width: 320, height: 740 });
    await noOverflow(page);
  } finally {
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
