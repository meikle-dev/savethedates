import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection, workspaceLink } from "./helpers/workspace";

const local = localSupabase();
const sections = [
  ["Overview", "/dashboard"],
  ["Basics", "/dashboard/basics"],
  ["Design", "/dashboard/design"],
  ["Details", "/dashboard/details"],
  ["RSVP", "/dashboard/rsvp"],
  ["Guests", "/dashboard/guests"],
  ["Publish", "/dashboard/publish"],
] as const;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/account/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

function daysFromToday(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("sections require an owner and a saved wedding", async ({ page }) => {
  for (const [, path] of sections) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/account\/sign-in$/);
  }
  const email = `dashboard-new-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  try {
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard\/basics$/);
    await expect(page.getByRole("navigation", { name: "Workspace sections" })).toHaveCount(0);
    for (const path of ["/dashboard/design", "/dashboard/details", "/dashboard/rsvp", "/dashboard/guests", "/dashboard/publish"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard\/basics$/);
    }
  } finally {
    await local.admin.auth.admin.deleteUser(created.data.user!.id);
  }
});

test("section navigation fits phones, tablets and desktops", async ({ page }) => {
  const email = `dashboard-nav-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  try {
    expect((await local.admin.from("weddings").insert({ owner_id: created.data.user!.id, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" })).error).toBeNull();
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard$/);
    const nav = page.getByRole("navigation", { name: "Workspace sections" });
    const toggle = nav.getByRole("button", { name: "Sections" });
    const currentLabel = nav.locator(".ws-nav-current");
    const links = nav.getByRole("link");
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

    // Phones: the current section is always visible, and every section is two taps away.
    for (const width of [320, 375, 390, 767]) {
      await page.setViewportSize({ width, height: 740 });
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(links).toHaveCount(0);
      await expect(currentLabel).toHaveText("Current section: Overview");
      expect((await nav.boundingBox())!.height).toBeLessThanOrEqual(64);
      expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await noOverflow()).toBe(true);
      await workspaceLink(page, "Overview");
      await expect(links).toHaveCount(sections.length);
      for (const [name] of sections) {
        const box = (await nav.getByRole("link", { name, exact: true }).boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      await expect(nav.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
      expect(await noOverflow()).toBe(true);
      await toggle.click();
      await expect(links).toHaveCount(0);
    }

    // Keyboard: Tab reaches the toggle, Enter/Space open it, Escape closes it and returns focus.
    await page.setViewportSize({ width: 390, height: 740 });
    await page.locator("body").evaluate((body) => { body.tabIndex = -1; body.focus(); body.removeAttribute("tabindex"); });
    for (let i = 0; i < 10 && !(await toggle.evaluate((element) => element === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "Overview", exact: true })).toBeFocused();

    // A tap outside closes the menu.
    await page.mouse.click(10, 720);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Choosing a section navigates, closes the menu and returns focus to the toggle.
    await (await workspaceLink(page, "Guests")).click();
    await expect(page).toHaveURL(/\/dashboard\/guests$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(currentLabel).toHaveText("Current section: Guests");

    // Back and forward close an open menu.
    await workspaceLink(page, "Basics");
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(currentLabel).toHaveText("Current section: Overview");
    await workspaceLink(page, "Basics");
    await page.goForward();
    await expect(page).toHaveURL(/\/dashboard\/guests$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.screenshot({ path: test.info().outputPath("nav-390.png") });
    await workspaceLink(page, "Guests");
    await page.screenshot({ path: test.info().outputPath("nav-390-open.png") });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.screenshot({ path: test.info().outputPath("nav-320-open.png") });

    // Tablets: all seven sections in one row, with no sideways scrolling or clipping.
    for (const width of [768, 1023]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(toggle).toBeHidden();
      await expect(links).toHaveCount(sections.length);
      const boxes = await Promise.all(sections.map(([name]) => nav.getByRole("link", { name, exact: true }).boundingBox()));
      for (const box of boxes) {
        expect(box!.y).toBe(boxes[0]!.y);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      expect(await nav.locator("ul").evaluate((list) => list.scrollWidth <= list.clientWidth)).toBe(true);
      expect(await noOverflow()).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`nav-${width}.png`) });
    }

    // Desktop keeps the sidebar.
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(toggle).toBeHidden();
      const [first, second] = await Promise.all(["Overview", "Basics"].map((name) => nav.getByRole("link", { name, exact: true }).boundingBox()));
      expect(second!.y).toBeGreaterThan(first!.y);
      expect(first!.x).toBe(second!.x);
      await page.screenshot({ path: test.info().outputPath(`nav-${width}.png`) });
    }
  } finally {
    await local.admin.auth.admin.deleteUser(created.data.user!.id);
  }
});

test("overview summarises the owner's own wedding and every section is reachable", async ({ page }) => {
  const email = `dashboard-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const other = await local.admin.auth.admin.createUser({ email: `dashboard-other-${crypto.randomUUID()}@example.test`, password, email_confirm: true });
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  expect(other.error).toBeNull();
  const ownerId = created.data.user!.id;
  const slug = `dashboard-${crypto.randomUUID()}`;
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: daysFromToday(120), location: "Bath", slug, rsvp_enabled: true }).select("id").single();
    expect(wedding.error).toBeNull();
    const otherWedding = await local.admin.from("weddings").insert({ owner_id: other.data.user!.id, first_name: "Other", second_name: "Couple", wedding_date: "2027-09-18", location: "York" }).select("id").single();
    expect(otherWedding.error).toBeNull();
    expect((await local.admin.from("shared_rsvp_responses").insert([
      { wedding_id: wedding.data!.id, responding_name: "Sam Taylor", attending: true },
      { wedding_id: wedding.data!.id, responding_name: "Jordan Lee", attending: false },
      { wedding_id: wedding.data!.id, responding_name: "Priya Shah", attending: true },
      { wedding_id: otherWedding.data!.id, responding_name: "Not Yours", attending: true },
    ])).error).toBeNull();

    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard$/);
    const overview = page.getByRole("region", { name: "Alex & Morgan" });
    await expect(page).toHaveTitle("Overview · SaveTheDates");
    await expect(overview.getByRole("article", { name: "Site status" })).toContainText("Private draft");
    await expect(overview.getByRole("article", { name: "Countdown" })).toContainText("120 days");
    // RSVPs are switched on, but guests cannot reply until the site is live.
    const rsvp = overview.getByRole("article", { name: /RSVPs · opens when published/ });
    await expect(rsvp).toContainText("3 responses");
    await expect(rsvp).toContainText("2 attending · 1 not attending");
    await expect(overview.getByRole("region", { name: "Latest responses" }).getByRole("listitem")).toHaveCount(3);
    await expect(overview.getByText("Not Yours")).toHaveCount(0);
    const checklist = overview.getByRole("region", { name: "Setup checklist" });
    await expect(checklist).toContainText("2 of 6 complete");
    await expect(checklist.getByRole("link", { name: /Open RSVPs \(done\)/ })).toHaveAttribute("href", "/dashboard/rsvp");
    await expect(checklist.getByRole("link", { name: /Purchase your site \(to do\)/ })).toHaveAttribute("href", "/dashboard/publish");
    // The shared link only works once the site is live, so it is not offered on a draft.
    await expect(overview.getByRole("button", { name: "Copy RSVP link" })).toHaveCount(0);

    const current = page.getByRole("navigation", { name: "Workspace sections" }).locator("a[aria-current='page']");
    for (const [name, path] of sections) {
      await openWorkspaceSection(page, name);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(current).toHaveText(name);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(`${name} · SaveTheDates`);
      await page.reload();
      await expect(current).toHaveText(name);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }

    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true, first_published_at: new Date().toISOString(), details_enabled: true, ceremony_venue: "Bath Abbey" }).eq("id", wedding.data!.id)).error).toBeNull();
    await openWorkspaceSection(page, "Overview");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(overview.getByRole("article", { name: "Site status" })).toContainText("Published");
    await expect(overview.getByRole("article", { name: "Site status" }).getByRole("link", { name: `/${slug}` })).toHaveAttribute("href", `/${slug}`);
    await expect(overview.getByRole("button", { name: "Copy RSVP link" })).toBeVisible();
    await expect(overview.getByRole("article", { name: /RSVPs · open/ })).toContainText("3 responses");
    await expect(overview.getByRole("region", { name: "Setup checklist" })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("dashboard-overview.png"), fullPage: true });
  } finally {
    await local.admin.auth.admin.deleteUser(ownerId);
    await local.admin.auth.admin.deleteUser(other.data.user!.id);
  }
});
