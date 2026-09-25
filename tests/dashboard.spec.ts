import { expect, test, type Locator, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection, workspaceLink } from "./helpers/workspace";
import { formatWeddingDate, rsvpDeadline } from "../src/features/weddings/wedding";

const local = localSupabase();
const caution = "rgb(179, 71, 15)";
const published = "rgb(47, 107, 79)";
const siteStatusValue = (overview: Locator) => overview.getByRole("article", { name: "Site status" }).locator(".ws-stat-value");
const sections = [
  ["Overview", "/dashboard"],
  ["Basics", "/dashboard/basics"],
  ["Design", "/dashboard/design"],
  ["Invitation", "/dashboard/invitation"],
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
    for (const path of ["/dashboard/design", "/dashboard/invitation", "/dashboard/details", "/dashboard/rsvp", "/dashboard/guests", "/dashboard/publish"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard\/basics$/);
    }
  } finally {
    await local.admin.auth.admin.deleteUser(created.data.user!.id);
  }
});

test("Basics explains date errors, saves a first wedding, and treats later edits as edits", async ({ page }) => {
  const email = `dashboard-basics-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const ownerId = created.data.user!.id;
  const date = page.getByLabel("Wedding date");
  const next = page.getByRole("link", { name: "Next: choose your style" });
  try {
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard\/basics$/);
    await page.getByLabel("Your name").fill("Alex");
    await page.getByLabel("Your partner’s name").fill("Morgan");
    await page.getByLabel("Wedding location").fill("Bath");

    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.locator("#wedding_date-error")).toHaveText("Choose your wedding date.");
    await expect(next).toHaveCount(0);
    expect((await local.admin.from("weddings").select("id").eq("owner_id", ownerId)).data).toHaveLength(0);

    await date.fill("1800-01-01");
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.locator("#wedding_date-error")).toHaveText("Choose a valid date between 1900 and 2199.");
    await expect(next).toHaveCount(0);
    await expect(page.getByLabel("Your name")).toHaveValue("Alex");

    const futureDate = daysFromToday(120);
    await date.fill(futureDate);
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.getByText("Your private draft has been saved.", { exact: true })).toBeVisible();
    await expect(next).toHaveAttribute("href", "/dashboard/design");
    await expect(page).toHaveURL(/\/dashboard\/basics$/);
    await expect.poll(async () => (await local.admin.from("weddings").select("wedding_date").eq("owner_id", ownerId).single()).data?.wedding_date).toBe(futureDate);
    if (test.info().project.name === "mobile") await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.screenshot({ path: test.info().outputPath("basics-first-save.png"), fullPage: test.info().project.name === "desktop" });

    await page.reload();
    await expect(next).toHaveCount(0);
    await expect(date).toHaveValue(futureDate);
    const pastDate = daysFromToday(-30);
    await date.fill(pastDate);
    await expect(page.getByText("This date has passed. Check it before you share your site.")).toBeVisible();
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.getByText("Your private draft has been saved.", { exact: true })).toBeVisible();
    await expect(next).toHaveCount(0);
    await expect.poll(async () => (await local.admin.from("weddings").select("wedding_date").eq("owner_id", ownerId).single()).data?.wedding_date).toBe(pastDate);
  } finally {
    await local.admin.auth.admin.deleteUser(ownerId);
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
    // The phone menu fades in (F032); measure its links once that brief reveal has settled.
    const settled = () => nav.locator("ul").evaluate((list) => Promise.all(list.getAnimations().map((animation) => animation.finished.catch(() => undefined))).then(() => undefined));

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
      await settled();
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

    // Tablets: all eight sections in one row, with no sideways scrolling or clipping.
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

test("overview summarises the owner's own wedding and every section is reachable", async ({ page, baseURL }) => {
  // A controllable native share sheet: "abort" behaves like the couple closing it, "fail" like a device error.
  await page.addInitScript(() => {
    const record = window as unknown as { shared: string[]; shareMode: string; shareCalls: number };
    record.shared = [];
    record.shareMode = "ok";
    record.shareCalls = 0;
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: async (data: { text: string }) => {
      record.shareCalls += 1;
      if (record.shareMode === "abort") throw new DOMException("Share canceled", "AbortError");
      if (record.shareMode === "fail") throw new DOMException("Not allowed", "NotAllowedError");
      record.shared.push(data.text);
    } });
  });
  const email = `dashboard-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const other = await local.admin.auth.admin.createUser({ email: `dashboard-other-${crypto.randomUUID()}@example.test`, password, email_confirm: true });
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  expect(other.error).toBeNull();
  const ownerId = created.data.user!.id;
  const slug = `dashboard-${crypto.randomUUID()}`;
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: daysFromToday(120), location: "Bath", slug, rsvp_enabled: true }).select("id, rsvp_share_secret").single();
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
    await expect(siteStatusValue(overview)).toHaveCSS("color", caution);
    await expect(page.locator(".ws-top .badge").filter({ hasText: "Private draft" })).toHaveCSS("color", caution);
    await expect(overview.getByRole("article", { name: "Countdown" })).toContainText("120 days");
    // RSVPs are switched on, but guests cannot reply until the site is live.
    const rsvp = overview.getByRole("article", { name: /RSVPs · opens when published/ });
    await expect(rsvp).toContainText("3 responses");
    await expect(rsvp).toContainText("2 attending · 1 not attending");
    await expect(overview.getByRole("region", { name: "Latest responses" }).getByRole("listitem")).toHaveCount(3);
    await expect(overview.getByText("Not Yours")).toHaveCount(0);
    const checklist = overview.getByRole("region", { name: "Setup checklist" });
    await expect(checklist).toContainText("2 of 7 complete");
    await expect(checklist.getByRole("link", { name: /Open RSVPs \(done\)/ })).toHaveAttribute("href", "/dashboard/rsvp");
    await expect(checklist.getByRole("link", { name: /Purchase your site \(to do\)/ })).toHaveAttribute("href", "/dashboard/publish");
    // The guest link only works once the site is live, so a draft offers no share panel or actions.
    await expect(page.locator("#guest-link")).toHaveCount(0);
    await expect(overview.getByRole("button", { name: /^(Share|Copy)/ })).toHaveCount(0);
    await expect(overview.getByRole("link", { name: /Share on WhatsApp/ })).toHaveCount(0);

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
    await expect(siteStatusValue(overview)).toHaveCSS("color", published);
    await expect(overview.getByRole("article", { name: "Site status" }).getByRole("link", { name: "Share your guest link" })).toHaveAttribute("href", "#guest-link");
    await expect(overview.getByRole("article", { name: /RSVPs · open/ })).toContainText("3 responses");
    await expect(overview.getByRole("region", { name: "Setup checklist" })).toHaveCount(0);
    // F042: the live Overview leads with the same absolute guest link and share actions as Publish.
    const guestLink = `${new URL(baseURL!).origin}/${slug}/${wedding.data!.rsvp_share_secret}`;
    const panel = page.locator("#guest-link");
    await expect(panel.getByText(guestLink, { exact: true })).toBeVisible();
    await expect(panel.getByText("RSVPs open", { exact: true })).toBeVisible();
    const message = `Save the date! Alex & Morgan are getting married on ${formatWeddingDate(daysFromToday(120))} at Bath. Details and RSVP here: ${guestLink}`;
    await expect(panel.getByLabel("Message to send")).toHaveValue(message);
    const share = panel.getByRole("button", { name: "Share", exact: true });
    const feedback = panel.locator("[role=status], [role=alert]");
    // Closing the share sheet is reported as neither success nor failure.
    await page.evaluate(() => { (window as unknown as { shareMode: string }).shareMode = "abort"; });
    await share.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { shareCalls: number }).shareCalls)).toBe(1);
    await expect(feedback).toHaveText([""]);
    await page.evaluate(() => { (window as unknown as { shareMode: string }).shareMode = "fail"; });
    await share.click();
    await expect(panel.getByRole("alert")).toHaveText("Sharing didn’t work on this device. Use Copy message instead.");
    await page.evaluate(() => { (window as unknown as { shareMode: string }).shareMode = "ok"; });
    await share.click();
    await expect(panel.getByRole("alert")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { shared: string[] }).shared)).toEqual([message]);
    await expect(panel.getByRole("link", { name: /Share on WhatsApp/ })).toHaveClass(/button-secondary/);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`dashboard-overview-live-${width}.png`), fullPage: true });
    }

    // A past closing date keeps the link shareable, with the closed status stated explicitly.
    expect((await local.admin.from("weddings").update({ rsvp_closes_on: daysFromToday(-2) }).eq("id", wedding.data!.id)).error).toBeNull();
    await page.reload();
    await expect(panel.getByText("RSVPs closed", { exact: true })).toBeVisible();
    await expect(panel).toContainText(`RSVPs closed at ${rsvpDeadline(daysFromToday(-2)).exact}. Guests can still view your site but can’t reply.`);
    await expect(panel.getByLabel("Message to send")).toHaveValue(message.replace("Details and RSVP here", "Find out more"));
    await expect(panel.getByText(guestLink, { exact: true })).toBeVisible();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`dashboard-overview-closed-${width}.png`), fullPage: true });
    }
    await openWorkspaceSection(page, "Publish");
    await expect(page.getByRole("heading", { level: 1, name: "Share your site" })).toBeVisible();
    await expect(panel.getByText("RSVPs closed", { exact: true })).toBeVisible();
    await expect(panel.getByText(guestLink, { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("publish-closed.png"), fullPage: true });

    // Expired access: the site is no longer live, so no panel or link is offered.
    expect((await local.admin.from("stripe_payments").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("wedding_id", wedding.data!.id)).error).toBeNull();
    await page.goto("/dashboard");
    await expect(overview.getByRole("article", { name: "Site status" })).toContainText("Offline");
    await expect(siteStatusValue(overview)).not.toHaveCSS("color", caution);
    await expect(siteStatusValue(overview)).not.toHaveCSS("color", published);
    await expect(overview.getByRole("article", { name: /RSVPs · site offline/ })).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expect(page.getByText(guestLink)).toHaveCount(0);
  } finally {
    await local.admin.auth.admin.deleteUser(ownerId);
    await local.admin.auth.admin.deleteUser(other.data.user!.id);
  }
});

test("the guest link uses the configured origin, not the request host", async ({ browser, baseURL }) => {
  // The app is configured for 127.0.0.1; the owner reaches it through a different host name for the same server.
  const configured = new URL(baseURL!);
  test.skip(configured.hostname !== "127.0.0.1", "Needs a local server configured for 127.0.0.1");
  const otherHost = `${configured.protocol}//localhost:${configured.port}`;
  const email = `dashboard-host-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const ownerId = created.data.user!.id;
  const slug = `host-${crypto.randomUUID()}`;
  const context = await browser.newContext({ baseURL: otherHost });
  const page = await context.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: daysFromToday(90), location: "Bath", slug }).select("id, rsvp_share_secret").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    const guestLink = `${configured.origin}/${slug}/${wedding.data!.rsvp_share_secret}`;

    await signIn(page, email, password);
    await expect(page).toHaveURL(`${otherHost}/dashboard`);
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: otherHost });
    for (const path of ["/dashboard", "/dashboard/publish"]) {
      await page.goto(path);
      const panel = page.locator("#guest-link");
      await expect(panel.getByText(guestLink, { exact: true })).toBeVisible();
      expect(await panel.getByLabel("Message to send").inputValue()).toContain(guestLink);
      await panel.getByRole("button", { name: "Copy link" }).click();
      await expect(panel.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(guestLink);
      expect(await page.content()).not.toContain(`localhost:${configured.port}/${slug}`);
    }
    await page.goto("/dashboard/rsvp");
    await expect(page.locator("#rsvp-guest-link")).toHaveText(guestLink);
  } finally {
    await context.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
