import { expect, test, type Browser, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();
const longName = "Guest 312 Wolfeschlegelsteinhausenbergerdorff-Featherstonehaugh";

async function createOwner(prefix: string) {
  const email = `${prefix}-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create guests test owner");
  const wedding = await local.admin.from("weddings").insert({ owner_id: created.data.user.id, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" }).select("id").single();
  if (wedding.error) throw new Error("Cannot create guests test wedding");
  return { email, password, userId: created.data.user.id, weddingId: wedding.data.id };
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/account/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function ownerPage(browser: Browser, baseURL: string | undefined, owner: { email: string; password: string }) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await signIn(page, owner.email, owner.password);
  return { context, page };
}

function guests(page: Page) {
  const panel = page.getByRole("region", { name: "Guest responses" });
  return {
    panel,
    rows: panel.locator("tbody tr.guest-row"),
    names: () => panel.locator("tbody tr.guest-row th").allTextContents(),
    showing: panel.getByRole("navigation", { name: "Guest response pages" }).locator("p"),
    summary: page.getByRole("group", { name: "RSVP summary" }),
  };
}

test("guest responses are paginated, filtered, searched and corrected per owner", async ({ page, browser, baseURL }) => {
  // A long, data-heavy journey (312 responses, paging, search, corrections). It takes 20–26 s on CI, too close to the
  // default 30 s budget when other browser tests share the runner.
  test.slow();
  const owner = await createOwner("guests-a");
  const other = await createOwner("guests-b");
  const contexts: { close: () => Promise<void> }[] = [];
  try {
    // 312 responses: Guest 312 is newest, even numbers attend, and 285-290 share one timestamp across the page 1/2 boundary.
    const base = Date.parse("2026-06-01T12:00:00Z");
    const seeded = Array.from({ length: 312 }, (_, index) => {
      const n = index + 1;
      const minute = n >= 285 && n <= 290 ? 285 : n;
      return { wedding_id: owner.weddingId, responding_name: n === 312 ? longName : `Guest ${String(n).padStart(3, "0")}`, attending: n % 2 === 0, responded_at: new Date(base + minute * 60_000).toISOString() };
    });
    expect((await local.admin.from("shared_rsvp_responses").insert(seeded)).error).toBeNull();

    // An owner with no responses sees the empty state and no controls; then 26 responses give two pages.
    const second = await ownerPage(browser, baseURL, other);
    contexts.push(second.context);
    await second.page.goto("/dashboard/guests");
    const otherList = guests(second.page);
    await expect(otherList.panel.getByText("No responses yet")).toBeVisible();
    await expect(otherList.panel.getByRole("search")).toHaveCount(0);
    expect((await local.admin.from("shared_rsvp_responses").insert(Array.from({ length: 26 }, (_, index) => ({ wedding_id: other.weddingId, responding_name: `Other ${String(index + 1).padStart(2, "0")}`, attending: true, responded_at: new Date(base + index * 60_000).toISOString() })))).error).toBeNull();
    await second.page.reload();
    await expect(otherList.showing).toHaveText("Showing 1–25 of 26");
    await expect(otherList.rows).toHaveCount(25);
    await second.page.goto("/dashboard/guests?page=2");
    await expect(otherList.showing).toHaveText("Showing 26–26 of 26");
    expect(await otherList.names()).toEqual(["Other 01"]);

    await signIn(page, owner.email, owner.password);
    await page.goto("/dashboard/guests");
    const list = guests(page);
    await expect(list.summary).toContainText("312Responses156Attending156Not attending");
    await expect(list.showing).toHaveText("Showing 1–25 of 312");
    await expect(list.rows).toHaveCount(25);
    await expect(list.rows.first()).toContainText(longName);
    for (const name of ["All 312", "Attending 156", "Not attending 156"]) await expect(list.panel.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(list.panel.getByRole("link", { name: "All 312", exact: true })).toHaveAttribute("aria-current", "true");

    // Pages do not overlap, even where timestamps tie.
    const firstPage = await list.names();
    await list.panel.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/\/dashboard\/guests\?page=2$/);
    await expect(list.showing).toHaveText("Showing 26–50 of 312");
    const secondPage = await list.names();
    expect(new Set([...firstPage, ...secondPage]).size).toBe(50);
    for (const n of [285, 286, 287, 288, 289, 290]) expect([...firstPage, ...secondPage]).toContain(`Guest ${n}`);

    await page.goto("/dashboard/guests?page=13");
    await expect(list.showing).toHaveText("Showing 301–312 of 312");
    await expect(list.rows).toHaveCount(12);
    await expect(list.panel.getByRole("link", { name: "Next" })).toHaveCount(0);
    await page.goto("/dashboard/guests?page=14");
    await expect(list.panel.getByText("Page out of range")).toBeVisible();
    await list.panel.getByRole("link", { name: "Go to the last page" }).click();
    await expect(page).toHaveURL(/page=13$/);
    for (const params of ["page=-1", "page=0", "page=abc", "page=1e3", "filter=bogus", "filter=all&page=99999999"]) {
      await page.goto(`/dashboard/guests?${params}`);
      await expect(list.showing).toHaveText("Showing 1–25 of 312");
    }

    // Filter and search combine, reset to page 1 and live in the URL.
    await page.goto("/dashboard/guests?page=3");
    await list.panel.getByRole("link", { name: "Attending 156", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/guests\?filter=attending$/);
    await expect(list.showing).toHaveText("Showing 1–25 of 156");
    await list.panel.getByLabel("Search by name").fill("Guest 30");
    await list.panel.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/filter=attending/);
    await expect(page).toHaveURL(/q=Guest\+30/);
    await expect(list.showing).toHaveText("Showing 1–5 of 5");
    expect(await list.names()).toEqual(["Guest 308", "Guest 306", "Guest 304", "Guest 302", "Guest 300"]);
    for (const name of ["All 10", "Attending 5", "Not attending 5"]) await expect(list.panel.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(list.summary).toContainText("312Responses");
    await page.reload();
    await expect(list.showing).toHaveText("Showing 1–5 of 5");
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard\/guests\?filter=attending$/);
    await expect(list.showing).toHaveText("Showing 1–25 of 156");

    // LIKE wildcards are searched literally.
    for (const q of ["%", "_", "\\", "*"]) {
      await page.goto(`/dashboard/guests?q=${encodeURIComponent(q)}`);
      if (q === "*") await expect(list.showing).toHaveText("Showing 1–25 of 312");
      else await expect(list.panel.getByText("No matches")).toBeVisible();
    }
    await page.goto("/dashboard/guests?q=Guest%2031");
    await expect(list.showing).toHaveText("Showing 1–3 of 3");
    await list.panel.getByRole("link", { name: "Clear search" }).click();
    await expect(page).toHaveURL(/\/dashboard\/guests$/);

    // Another owner's responses never appear, whatever the parameters.
    await page.goto("/dashboard/guests?q=Other");
    await expect(list.panel.getByText("No matches")).toBeVisible();
    await second.page.goto("/dashboard/guests?q=Guest");
    await expect(otherList.panel.getByText("No matches")).toBeVisible();
    await expect(otherList.summary).toContainText("26Responses");

    // Corrections and removals on a later page keep the page and update the totals.
    await page.goto("/dashboard/guests?page=2");
    const corrected = list.rows.filter({ hasText: "Guest 280" });
    await corrected.getByRole("button", { name: /Correct or remove/ }).click();
    const panel = page.locator(`#${await corrected.getByRole("button", { name: /Correct or remove/ }).getAttribute("aria-controls")}`);
    await panel.getByLabel("Responding name").fill("Guest 280 corrected");
    await panel.getByLabel("Not attending").check();
    await panel.getByRole("button", { name: "Save correction" }).click();
    await expect(panel.getByRole("status")).toHaveText("Response corrected.");
    await expect(list.rows.filter({ hasText: "Guest 280 corrected" })).toBeVisible();
    await expect(list.summary).toContainText("312Responses155Attending157Not attending");
    await expect(page).toHaveURL(/page=2$/);
    const removed = list.rows.filter({ hasText: "Guest 270" });
    await removed.getByRole("button", { name: /Correct or remove/ }).click();
    const removePanel = page.locator(`#${await removed.getByRole("button", { name: /Correct or remove/ }).getAttribute("aria-controls")}`);
    await removePanel.getByLabel("Remove this response from the list and totals").check();
    await removePanel.getByRole("button", { name: "Remove response" }).click();
    await expect(list.rows.filter({ hasText: "Guest 270" })).toHaveCount(0);
    await expect(list.panel.getByRole("status").filter({ hasText: "Response removed." })).toBeAttached();
    await expect(list.summary).toContainText("311Responses154Attending157Not attending");
    await expect(list.showing).toHaveText("Showing 26–50 of 311");
    await expect(page).toHaveURL(/page=2$/);

    // Overview uses the same totals and only the five latest responses.
    await page.goto("/dashboard");
    const latest = page.getByRole("region", { name: "Latest responses" });
    await expect(latest.getByRole("listitem")).toHaveCount(5);
    await expect(latest.getByRole("listitem").first()).toContainText(longName);
    await expect(page.getByText("311 responses")).toBeVisible();
    await latest.getByRole("link", { name: "View all guests" }).click();
    await expect(page).toHaveURL(/\/dashboard\/guests$/);

    // Long names stay readable without sideways scrolling.
    for (const width of [320, 390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(list.rows.first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // Phones: capture the stacked rows rather than the page header.
      if (width < 1024) await list.rows.first().evaluate((row) => row.scrollIntoView({ block: "center" }));
      await page.screenshot({ path: test.info().outputPath(`guests-${width}.png`), fullPage: width >= 1024 });
    }
    for (const link of await list.panel.getByRole("navigation").getByRole("link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  } finally {
    for (const context of contexts) await context.close();
    await local.admin.auth.admin.deleteUser(owner.userId);
    await local.admin.auth.admin.deleteUser(other.userId);
  }
});
