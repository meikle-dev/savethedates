import { expect, test, type Page } from "@playwright/test";
import { linkPages, type GuestLinkKind, type GuestPage } from "../src/features/weddings/guest-link";
import { rsvpDeadline } from "../src/features/weddings/wedding";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

// F065: separate Save the Date, Invitation and RSVP links.
const local = localSupabase();

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/account/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const daysFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const fitsWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const navLinks = (page: Page) => page.getByRole("navigation", { name: "Wedding site" }).getByRole("link");

async function createLiveWedding(values: Record<string, unknown>) {
  const email = `links-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const ownerId = created.data.user!.id;
  const slug = `links-${crypto.randomUUID().slice(0, 8)}`;
  const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, details_enabled: true, ceremony_venue: "The Old Hall", ...values }).select("id, rsvp_share_secret, invitation_share_secret").single();
  expect(wedding.error).toBeNull();
  expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
  expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
  const update = async (changes: Record<string, unknown>) => expect((await local.admin.from("weddings").update(changes).eq("id", wedding.data!.id)).error).toBeNull();
  return { email, password, ownerId, id: wedding.data!.id, slug, std: `/${slug}/${wedding.data!.rsvp_share_secret}`, inv: `/${slug}/${wedding.data!.invitation_share_secret}`, update };
}

test("couples send a Save the Date, an Invitation and an RSVP link, and each opens only its own pages", async ({ page, browser, baseURL }) => {
  test.slow();
  const closesOn = daysFromToday(60);
  const wedding = await createLiveWedding({ rsvp_enabled: true, rsvp_closes_on: closesOn, invitation_enabled: true });
  const origin = new URL(baseURL!).origin;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const guestPage = await guest.newPage();
  try {
    await signIn(page, wedding.email, wedding.password);
    const std = `${origin}${wedding.std}`;
    const invitation = `${origin}${wedding.inv}/invitation`;
    const rsvp = `${origin}${wedding.inv}/rsvp`;
    const news = "Alex & Morgan are getting married on 18 September 2027 at Bath.";

    // Three panels in sending order, each with its own link and message.
    const stdPanel = page.locator("#guest-link");
    const invPanel = page.locator("#invitation-link");
    const rsvpPanel = page.locator("#rsvp-link");
    await expect(stdPanel.getByRole("heading", { name: "Send your Save the Date" })).toBeVisible();
    await expect(stdPanel.getByText(std, { exact: true })).toBeVisible();
    await expect(stdPanel.getByLabel("Message to send")).toHaveValue(`Save the date! ${news} Find out more: ${std}`);
    await expect(stdPanel).toContainText("Opens your Save the Date and Details, but never your Invitation.");
    await expect(invPanel.getByRole("heading", { name: "Send your Invitation" })).toBeVisible();
    await expect(invPanel.getByText(invitation, { exact: true })).toBeVisible();
    await expect(invPanel.getByLabel("Message to send")).toHaveValue(`You’re invited! ${news} Your invitation and RSVP: ${invitation}`);
    await expect(rsvpPanel.getByText(rsvp, { exact: true })).toBeVisible();
    await expect(rsvpPanel.getByLabel("Message to send")).toHaveValue(`Please let us know if you can come by ${rsvpDeadline(closesOn).date}: ${rsvp}`);
    await expect(rsvpPanel).toContainText("It’s part of your Invitation link");
    await expect(rsvpPanel.getByText("Replace this link")).toHaveCount(0);
    const whatsAppText = async (panel: typeof stdPanel) => new URL((await panel.getByRole("link", { name: /Share on WhatsApp/ }).getAttribute("href"))!).searchParams.get("text");
    expect(await whatsAppText(invPanel)).toBe(`You’re invited! ${news} Your invitation and RSVP: ${invitation}`);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await invPanel.getByRole("button", { name: "Copy link" }).click();
    await expect(invPanel.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invitation);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await fitsWidth(page)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`links-overview-${width}.png`), fullPage: true });
    }

    // The Save the Date link: its navigation never offers the Invitation, or RSVP while the Invitation is on.
    await guestPage.goto(std);
    await expect(navLinks(guestPage)).toHaveText(["Save the date", "Details"]);
    await expect(guestPage).toHaveTitle(/^Save the Date · /);
    // The Invitation link opens at the Invitation, and its navigation has no Save the Date.
    await guestPage.goto(invitation);
    await expect(guestPage.getByRole("article")).toContainText("Alex");
    await expect(navLinks(guestPage)).toHaveText(["Invitation", "Details", "RSVP"]);
    await navLinks(guestPage).filter({ hasText: "Details" }).click();
    await expect(guestPage).toHaveURL(`${origin}${wedding.inv}/details`);
    await expect(navLinks(guestPage)).toHaveText(["Invitation", "Details", "RSVP"]);
    for (const path of [wedding.inv, `${wedding.std}/invitation`, `${wedding.std}/rsvp`]) expect((await guest.request.get(path)).status()).toBe(404);
    // Link previews name the link that was sent.
    const ogTitle = async (path: string) => (await (await guest.request.get(path)).text()).match(/<meta property="og:title" content="([^"]*)"/)?.[1];
    expect(await ogTitle(wedding.std)).toBe("Alex &amp; Morgan · Save the Date");
    expect(await ogTitle(`${wedding.inv}/invitation`)).toBe("Alex &amp; Morgan · Invitation");
    expect(await ogTitle(`${wedding.inv}/rsvp`)).toBe("RSVP for Alex &amp; Morgan’s wedding");

    // The RSVP link opens the reply form directly, and a reply through it reaches the guest list.
    await guestPage.goto(rsvp);
    await expect(guestPage.getByRole("heading", { name: "RSVP" })).toBeVisible();
    await expect(navLinks(guestPage)).toHaveText(["Invitation", "Details", "RSVP"]);
    await guestPage.getByLabel("Your name").fill("Sam Taylor");
    await guestPage.getByText("Regretfully declines").click();
    await guestPage.getByRole("button", { name: /Send RSVP/ }).click();
    await expect(guestPage.getByRole("heading", { name: "Thank you" })).toBeVisible();
    for (const width of [390, 1440]) {
      await guestPage.setViewportSize({ width, height: 900 });
      expect(await fitsWidth(guestPage)).toBe(true);
    }
    await openWorkspaceSection(page, "Guests");
    await expect(page.getByText("Sam Taylor")).toBeVisible();

    // Replacing the Invitation link stops only that link (and the RSVP link under it). Replies are kept.
    await openWorkspaceSection(page, "Overview");
    await invPanel.getByText("Replace this link").click();
    await invPanel.getByLabel("Replace my Invitation link and stop the old one working").check();
    await invPanel.getByRole("button", { name: "Replace Invitation link" }).click();
    await expect(invPanel.getByRole("status").filter({ hasText: "Invitation link replaced. The one you sent before no longer works. Your Save the Date link hasn’t changed." })).toBeVisible();
    await expect(invPanel.getByText(invitation, { exact: true })).toHaveCount(0);
    const newInvitation = (await invPanel.locator(".guest-link-url").textContent())!;
    expect(newInvitation).toMatch(new RegExp(`^${origin}/${wedding.slug}/[A-Za-z0-9_-]{43}/invitation$`));
    await expect(rsvpPanel.getByText(newInvitation.replace(/\/invitation$/, "/rsvp"), { exact: true })).toBeVisible();
    await expect(stdPanel.getByText(std, { exact: true })).toBeVisible();
    for (const path of [invitation, rsvp]) expect((await guest.request.get(path)).status()).toBe(404);
    expect((await guest.request.get(newInvitation)).status()).toBe(200);
    expect((await guest.request.get(std)).status()).toBe(200);
    await openWorkspaceSection(page, "Guests");
    await expect(page.getByText("Sam Taylor")).toBeVisible();

    // Invitation off: the couple is warned which sent links stop working, then RSVP moves back to the Save the Date link.
    await openWorkspaceSection(page, "Invitation");
    await page.getByLabel(/Show Invitation page/).uncheck();
    await expect(page.getByRole("note")).toContainText("Switching this off stops your Invitation link working, so guests who have it will see “page not found”. Replies move back to your Save the Date link");
    await page.getByLabel(/Show Invitation page/).check();
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.getByLabel(/Show Invitation page/).uncheck();
    await page.getByRole("button", { name: "Save live Invitation" }).click();
    await expect(page.getByRole("status").filter({ hasText: "saved and hidden from guests" })).toBeVisible();
    await openWorkspaceSection(page, "Overview");
    await expect(invPanel.getByRole("link", { name: "switch on your Invitation" })).toHaveAttribute("href", "/dashboard/invitation");
    await expect(invPanel.getByLabel("Message to send")).toHaveCount(0);
    await expect(rsvpPanel.getByText(`${std}/rsvp`, { exact: true })).toBeVisible();
    await expect(stdPanel.getByLabel("Message to send")).toHaveValue(`Save the date! ${news} Details and RSVP here: ${std}`);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await fitsWidth(page)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`links-overview-invitation-off-${width}.png`), fullPage: true });
    }
    expect((await guest.request.get(newInvitation)).status()).toBe(404);
    await guestPage.goto(std);
    await expect(navLinks(guestPage)).toHaveText(["Save the date", "Details", "RSVP"]);
    await openWorkspaceSection(page, "RSVP");
    await expect(page.locator("#rsvp-guest-link")).toHaveText(`${std}/rsvp`);

    // RSVP off: the RSVP panel says how to open RSVPs instead of offering a link.
    await wedding.update({ rsvp_enabled: false });
    await openWorkspaceSection(page, "Overview");
    await expect(rsvpPanel.getByRole("link", { name: "Open RSVPs" })).toHaveAttribute("href", "/dashboard/rsvp");
    await expect(rsvpPanel.getByLabel("Message to send")).toHaveCount(0);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(wedding.ownerId);
  }
});

test("every combination of Invitation, Details and RSVP opens only the table's pages", async ({ page, baseURL }) => {
  const wedding = await createLiveWedding({});
  const paths: Record<GuestLinkKind, Record<GuestPage, string>> = {
    save_the_date: { home: wedding.std, invitation: `${wedding.std}/invitation`, details: `${wedding.std}/details`, rsvp: `${wedding.std}/rsvp` },
    invitation: { home: wedding.inv, invitation: `${wedding.inv}/invitation`, details: `${wedding.inv}/details`, rsvp: `${wedding.inv}/rsvp` },
  };
  try {
    for (const invitation_enabled of [false, true]) for (const details_enabled of [false, true]) for (const rsvp_enabled of [false, true]) {
      const on = { invitation_enabled, details_enabled, rsvp_enabled };
      await wedding.update(on);
      for (const link of ["save_the_date", "invitation"] as const) {
        // RSVP stays reachable while off (it says replies aren't open), but only under the link that offers it.
        const pages = { ...linkPages(link, on), rsvp: linkPages(link, { ...on, rsvp_enabled: true }).rsvp };
        for (const [name, path] of Object.entries(paths[link]) as [GuestPage, string][]) {
          expect((await page.request.get(path)).status(), `${link} ${name} with ${JSON.stringify(on)}`).toBe(pages[name] ? 200 : 404);
        }
      }
      // The navigation a guest sees lists exactly the pages that link opens.
      const [link, start] = invitation_enabled ? ["invitation", paths.invitation.invitation] as const : ["save_the_date", paths.save_the_date.home] as const;
      await page.goto(new URL(start, baseURL).href);
      const expected = (Object.entries(linkPages(link, on)) as [GuestPage, boolean][]).filter(([, shown]) => shown).map(([name]) => ({ home: "Save the date", invitation: "Invitation", details: "Details", rsvp: "RSVP" })[name]);
      if (expected.length > 1) await expect(navLinks(page)).toHaveText(expected);
      else await expect(page.getByRole("navigation", { name: "Wedding site" })).toHaveCount(0);
      expect(await fitsWidth(page)).toBe(true);
    }
  } finally {
    await local.admin.auth.admin.deleteUser(wedding.ownerId);
  }
});

test("every guest page carries the Made with SaveTheDates credit without revealing the guest link", async ({ page }) => {
  // F076: the credit links home with campaign tags only, opens a new tab and sends no referrer.
  const wedding = await createLiveWedding({ rsvp_enabled: true, invitation_enabled: true });
  try {
    const pages: [string, string][] = [[wedding.std, "save-the-date"], [`${wedding.std}/details`, "details"], [`${wedding.inv}/invitation`, "invitation"], [`${wedding.inv}/rsvp`, "rsvp"]];
    for (const [path, type] of pages) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      expect(response?.headers()["referrer-policy"], path).toBe("no-referrer");
      const credit = page.getByRole("link", { name: "Made with SaveTheDates (opens in a new tab)" });
      await expect(credit, path).toHaveAttribute("href", `/?utm_source=guest-site&utm_medium=referral&utm_campaign=made-with&utm_content=${type}`);
      await expect(credit, path).toHaveAttribute("target", "_blank");
      await expect(credit, path).toHaveAttribute("rel", /noreferrer/);
      const href = (await credit.getAttribute("href"))!;
      for (const secret of [wedding.slug, wedding.std.split("/")[2], wedding.inv.split("/")[2], "Alex", "Morgan"]) expect(href, path).not.toContain(secret);
    }
    const [home] = await Promise.all([page.waitForEvent("popup"), page.getByRole("link", { name: "Made with SaveTheDates (opens in a new tab)" }).click()]);
    await expect(home).toHaveURL(/\/\?utm_source=guest-site&utm_medium=referral&utm_campaign=made-with&utm_content=rsvp$/);
    expect(await home.evaluate(() => document.referrer)).toBe("");
    await expect(home.getByRole("heading", { level: 1 })).toHaveText("Your wedding website,beautifully done.");
  } finally {
    await local.admin.auth.admin.deleteUser(wedding.ownerId);
  }
});
