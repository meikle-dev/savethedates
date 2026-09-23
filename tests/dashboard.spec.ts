import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

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

    const nav = page.getByRole("navigation", { name: "Workspace sections" });
    for (const [name, path] of sections) {
      await nav.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(`${name} · SaveTheDates`);
      await page.reload();
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }

    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true, first_published_at: new Date().toISOString(), details_enabled: true, ceremony_venue: "Bath Abbey" }).eq("id", wedding.data!.id)).error).toBeNull();
    await nav.getByRole("link", { name: "Overview", exact: true }).click();
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
