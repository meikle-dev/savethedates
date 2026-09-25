import { expect, test, type Page } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

const local = localSupabase();

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/account/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

const daysFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const fitsWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("couples write, preview and share an optional invitation that follows their RSVP settings", async ({ page, browser, baseURL }) => {
  test.slow();
  const email = `invitation-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const ownerId = created.data.user!.id;
  const slug = `invitation-${crypto.randomUUID().slice(0, 8)}`;
  const closesOn = daysFromToday(60);
  const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alexandra-Marguerite", second_name: "Christopher-Alexander", wedding_date: "2027-09-18", location: "Bath, England", slug, rsvp_enabled: true, rsvp_closes_on: closesOn }).select("id, rsvp_share_secret").single();
  expect(wedding.error).toBeNull();
  const home = `/${slug}/${wedding.data!.rsvp_share_secret}`;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const guestPage = await guest.newPage();
  try {
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard$/);
    const pages = page.getByRole("region", { name: "Guest pages" });
    await expect(pages.getByRole("link", { name: /Invitation\s*Off/ })).toBeVisible();
    await expect(pages.getByRole("link", { name: /Save the Date\s*On when published/ })).toBeVisible();

    await openWorkspaceSection(page, "Invitation");
    await expect(page.getByRole("heading", { name: "Wedding Invitation" })).toBeVisible();
    await expect(page.getByText("Saved Invitation is hidden from guests.")).toBeVisible();
    await page.getByLabel(/Opening line/).fill("Together with their families");
    await page.getByLabel(/Afterwards/).fill("followed by dinner and dancing");
    await page.getByLabel(/Ceremony time/).fill("2:30 pm");
    await page.getByLabel(/^Venue/).fill("The Old Hall");
    await page.getByLabel(/^Address/).fill("1 High Street, Bath BA1 1AA");
    await page.getByLabel(/Show Invitation page/).check();
    await expect(page.getByText("Save to apply this visibility change.")).toBeVisible();
    await page.getByRole("button", { name: "Save Invitation" }).click();
    await expect(page.getByRole("status").filter({ hasText: "ready for guests when you publish" })).toBeVisible();
    await expect(page.getByText("Saved Invitation will appear when you publish.")).toBeVisible();

    // Ceremony details are shared with the Details page.
    await openWorkspaceSection(page, "Details");
    await expect(page.locator("#ceremony_venue")).toHaveValue("The Old Hall");
    await expect(page.locator("#ceremony_time")).toHaveValue("2:30 pm");

    // With Details switched on, the shared ceremony fields can't all be cleared from the Invitation form.
    expect((await local.admin.from("weddings").update({ details_enabled: true }).eq("id", wedding.data!.id)).error).toBeNull();
    await openWorkspaceSection(page, "Invitation");
    for (const field of [/Ceremony time/, /^Venue/, /^Address/]) await page.getByLabel(field).fill("");
    await page.getByRole("button", { name: "Save Invitation" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "would be left empty" })).toBeVisible();
    expect((await local.admin.from("weddings").select("ceremony_venue").eq("id", wedding.data!.id).single()).data!.ceremony_venue).toBe("The Old Hall");
    expect((await local.admin.from("weddings").update({ details_enabled: false }).eq("id", wedding.data!.id)).error).toBeNull();

    await page.goto("/dashboard/preview/invitation");
    await expect(page.getByText(/Private Invitation preview/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Alexandra-Marguerite");
    await expect(page.getByText("request the pleasure of your company at their wedding")).toBeVisible();
    await expect(page.getByText("Saturday 18 September 2027")).toBeVisible();
    await expect(page.getByRole("link", { name: /Reply online/ })).toHaveAttribute("href", /\/dashboard\/preview\/rsvp/);

    // Published and paid for: guests find the invitation from the navigation.
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true, first_published_at: new Date().toISOString() }).eq("id", wedding.data!.id)).error).toBeNull();
    await guestPage.goto(home);
    await guestPage.getByRole("navigation", { name: "Wedding site" }).getByRole("link", { name: "Invitation" }).click();
    await expect(guestPage).toHaveURL(new RegExp(`${home}/invitation$`));
    await expect(guestPage).toHaveTitle(/^Invitation · /);
    const card = guestPage.getByRole("article");
    await expect(card.getByText("Together with their families")).toBeVisible();
    await expect(card.getByRole("heading", { level: 1 })).toContainText("Christopher-Alexander");
    await expect(card.getByText("The Old Hall")).toBeVisible();
    await expect(card.getByText("1 High Street, Bath BA1 1AA")).toBeVisible();
    await expect(card.getByText("followed by dinner and dancing")).toBeVisible();
    await expect(card.getByText(/^Kindly reply by /)).toBeVisible();
    await expect(card.getByRole("link", { name: /Reply online/ })).toHaveAttribute("href", `${home}/rsvp`);
    // The action is a link styled as a light-text button: its keyboard focus ring must use the theme accent, not white.
    // Reach it by keyboard: after a mouse click, Chromium doesn't treat programmatic focus as :focus-visible.
    const reply = card.getByRole("link", { name: /Reply online/ });
    await reply.focus();
    await guestPage.keyboard.press("Shift+Tab");
    await guestPage.keyboard.press("Tab");
    expect(await reply.evaluate((link) => [link.matches(":focus-visible"), getComputedStyle(link).outlineColor])).toEqual([true, expect.not.stringMatching(/^rgb\(255, 255, 255\)$/)]);
    await expect(guestPage.getByRole("link", { name: "Travel, accommodation and more" })).toHaveCount(0);
    expect(await fitsWidth(guestPage)).toBe(true);

    // No closing date: guests are asked to reply online, with no date.
    expect((await local.admin.from("weddings").update({ rsvp_closes_on: null }).eq("id", wedding.data!.id)).error).toBeNull();
    await guestPage.reload();
    await expect(card.getByText("Kindly reply online")).toBeVisible();
    await expect(card.getByRole("link", { name: /Reply online/ })).toBeVisible();

    // Past the closing date (UTC): replies have closed and there's no reply action.
    expect((await local.admin.from("weddings").update({ rsvp_closes_on: daysFromToday(-2) }).eq("id", wedding.data!.id)).error).toBeNull();
    await guestPage.reload();
    await expect(card.getByText(/Replies have now closed/)).toBeVisible();
    await expect(card.getByRole("link", { name: /Reply online/ })).toHaveCount(0);

    // RSVPs off: no reply section, and switching the invitation on never reopened them.
    expect((await local.admin.from("weddings").update({ rsvp_enabled: false }).eq("id", wedding.data!.id)).error).toBeNull();
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(guestPage.getByRole("link", { name: /Reply online/ })).toHaveCount(0);
    await expect(guestPage.getByText(/Kindly reply/)).toHaveCount(0);

    await page.goto("/dashboard");
    await expect(pages.getByRole("link", { name: /Invitation\s*On/ })).toBeVisible();

    // Switched off: guests get the same 404 as any unavailable page, and the link leaves the navigation.
    await openWorkspaceSection(page, "Invitation");
    await page.getByLabel(/Show Invitation page/).uncheck();
    await page.getByRole("button", { name: "Save live Invitation" }).click();
    await expect(page.getByRole("status").filter({ hasText: "saved and hidden from guests" })).toBeVisible();
    expect((await guest.request.get(`${home}/invitation`)).status()).toBe(404);
    await guestPage.goto(home);
    await expect(guestPage.getByRole("navigation", { name: "Wedding site" })).toHaveCount(0);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});

test("every theme's example invitation reads well on phones and desktops", async ({ page }) => {
  test.slow();
  const width = page.viewportSize()!.width;
  for (const theme of themes) {
    for (const viewport of [width, 320]) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.goto(`/examples/${theme.id}/invitation`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Olivia");
      await expect(page.getByText("Monday 14 June 2027")).toBeVisible();
      expect(await fitsWidth(page), `${theme.id} at ${viewport}px`).toBe(true);
    }
  }
  await page.goto("/examples/minimal");
  await page.getByRole("navigation", { name: "Wedding site" }).getByRole("link", { name: "Invitation" }).click();
  await expect(page).toHaveURL(/\/examples\/minimal\/invitation$/);
});
