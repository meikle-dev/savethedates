import { expect, test, type Page, type Response } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";
import { rsvpDeadline } from "../src/features/weddings/wedding";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

const local = localSupabase();

function openSection(page: Page, name: string) {
  return openWorkspaceSection(page, name);
}

function expectPrivate(response: Response | null) {
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["cache-control"]).toMatch(/no-store|no-cache, must-revalidate/);
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-robots-tag"]).toContain("noindex");
}

test("one shared link collects separate named responses and can be replaced", async ({ page, browser, baseURL }) => {
  const email = `shared-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const slug = `shared-e2e-${crypto.randomUUID()}`;
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create RSVP test owner");
  const ownerId = created.data.user.id;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const guestPage = await guest.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, details_enabled: true, ceremony_venue: "Bath Abbey", rsvp_enabled: true }).select("id").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();

    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await openSection(page, "RSVP");
    const section = page.getByRole("region", { name: "RSVP", exact: true });
    await expect(section.getByRole("heading", { name: "Your guest link" })).toBeVisible();
    // The RSVP section shows the same absolute guest link as Publish and the Overview.
    const origin = new URL(baseURL!).origin;
    const displayedLink = section.locator("#rsvp-guest-link");
    const oldHome = (await displayedLink.textContent())!;
    expect(oldHome.startsWith(`${origin}/${slug}/`)).toBe(true);
    expect(oldHome.slice(`${origin}/${slug}/`.length)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const shareUrl = `${oldHome}/rsvp`;
    await expect(section.getByRole("link", { name: /Open RSVP page/ })).toHaveAttribute("href", shareUrl);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await section.getByRole("button", { name: "Copy link" }).click();
    await expect(section.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(oldHome);
    await page.screenshot({ path: test.info().outputPath("shared-rsvp-workspace.png"), fullPage: true });

    expectPrivate(await guestPage.goto(shareUrl));
    await expect(guestPage.getByRole("heading", { name: "RSVP" })).toBeVisible();
    await expect(guestPage.getByText("Please let us know if you can join us.")).toBeVisible();
    await guestPage.getByRole("link", { name: "Save the date" }).click();
    expectPrivate(await guestPage.reload());
    await guestPage.getByRole("link", { name: "Details" }).click();
    expectPrivate(await guestPage.reload());
    await guestPage.getByRole("link", { name: "RSVP" }).click();
    await expect(guestPage).toHaveURL(new URL(shareUrl, baseURL).href);

    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByText("Enter your name.")).toBeVisible();
    await expect(guestPage.getByText("Choose attending or not attending.")).toBeVisible();
    await guestPage.getByLabel("Your name").fill("Sam Taylor");
    await guestPage.getByLabel("Joyfully accepts").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("heading", { name: "Thank you" })).toBeVisible();
    await expect(guestPage.getByRole("status")).toContainText("Sam Taylor");
    await guestPage.reload();
    await expect(guestPage.getByLabel("Your name")).toHaveValue("");
    await guestPage.getByLabel("Your name").fill("Jordan Lee");
    await guestPage.getByLabel("Regretfully declines").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("Jordan Lee");

    await openSection(page, "Guests");
    const guests = page.getByRole("region", { name: "Who’s coming" });
    await expect(guests.getByText("Sam Taylor")).toBeVisible();
    await expect(guests.getByText("Jordan Lee")).toBeVisible();
    await expect(guests.getByLabel("RSVP summary").getByText("2", { exact: true })).toBeVisible();
    await openSection(page, "Overview");
    await expect(page.getByRole("region", { name: "Latest responses" }).getByText("Jordan Lee")).toBeVisible();
    await openSection(page, "Guests");
    const responseList = guests.getByRole("region", { name: "Guest responses" });
    const correction = (name: string) => responseList.locator(".guest-row").filter({ hasText: name }).locator("xpath=following-sibling::tr[1]");
    const sam = correction("Sam Taylor");
    await responseList.getByRole("button", { name: "Correct or remove response from Sam Taylor" }).click();
    await sam.getByLabel("Responding name").fill("Sam T.");
    await sam.getByLabel("Not attending").check();
    await sam.getByRole("button", { name: "Save correction" }).click();
    await expect(responseList.getByText("Sam T.")).toBeVisible();
    await responseList.screenshot({ path: test.info().outputPath("shared-rsvp-responses.png") });
    const jordan = correction("Jordan Lee");
    await responseList.getByRole("button", { name: "Correct or remove response from Jordan Lee" }).click();
    await jordan.getByLabel("Remove this response from the list and totals").check();
    await jordan.getByRole("button", { name: "Remove response" }).click();
    await expect(responseList.getByText("Jordan Lee")).toHaveCount(0);
    // Every theme's RSVP page is rendered in rsvp-preview.spec.ts; the themes differ only in CSS.
    await guestPage.goto(shareUrl);
    for (const width of [320, 390, 1440]) {
      await guestPage.setViewportSize({ width, height: 900 });
      expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) await guestPage.screenshot({ path: test.info().outputPath("shared-rsvp-390.png"), fullPage: true });
    }
    await openSection(page, "RSVP");
    const updated = page.getByRole("region", { name: "RSVP", exact: true });
    await updated.getByLabel("Accept RSVPs").uncheck();
    await updated.getByRole("button", { name: "Save RSVP settings" }).click();
    await expect(updated.getByRole("status").filter({ hasText: "RSVP settings saved. Existing responses remain in Guests. Guests can view your site but can’t reply until you open RSVPs." })).toBeVisible();
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { name: "RSVPs aren’t open" })).toBeVisible();
    await expect(updated.getByText("Every link you shared before stops working, including your Save the Date.")).toBeVisible();
    await updated.getByLabel("Replace my guest link and stop every previously shared link from working").check();
    await updated.getByRole("button", { name: "Replace guest link" }).click();
    await expect(updated.getByRole("status").filter({ hasText: "including your Save the Date, no longer works" })).toBeVisible();
    await expect(displayedLink).not.toHaveText(oldHome);
    const newHome = (await displayedLink.textContent())!;
    expect(newHome.slice(`${origin}/${slug}/`.length)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const replacement = `${newHome}/rsvp`;
    // Replacing refreshes every owner display of the link, including the suggested share message.
    for (const [name, heading] of [["Overview", "Alex & Morgan"], ["Publish", "Share your site"]]) {
      await openSection(page, name);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`replaced-${name.toLowerCase()}.png`), fullPage: true });
      const panel = page.locator("#guest-link");
      await expect(panel.getByText(newHome, { exact: true })).toBeVisible();
      await expect(panel.getByText("RSVPs off", { exact: true })).toBeVisible();
      expect(await panel.getByLabel("Message to send").inputValue()).toContain(newHome);
      expect(new URL((await panel.getByRole("link", { name: /Share on WhatsApp/ }).getAttribute("href"))!).searchParams.get("text")).toContain(newHome);
      await expect(page.getByText(oldHome)).toHaveCount(0);
    }
    // Every page under the old link now gives the same 404 as an unknown link.
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { name: "Page not found" })).toBeVisible();
    for (const path of [oldHome, `${oldHome}/details`, shareUrl, `${oldHome}/photo`]) expect((await guest.request.get(path)).status()).toBe(404);
    await guestPage.goto(replacement);
    await expect(guestPage.getByRole("heading", { name: "RSVPs aren’t open" })).toBeVisible();
    expect((await local.admin.from("shared_rsvp_responses").select("id").eq("wedding_id", wedding.data!.id)).data).toHaveLength(1);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});

test("names alone, retired links and unknown secrets give the same private 404", async ({ page, browser, baseURL }) => {
  const email = `retired-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const slug = `retired-e2e-${crypto.randomUUID()}`;
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create RSVP test owner");
  const ownerId = created.data.user.id;
  const guest = await browser.newContext({ baseURL });
  const guestPage = await guest.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, details_enabled: true, ceremony_venue: "Bath Abbey", rsvp_enabled: true }).select("id, rsvp_share_secret").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    const secret = wedding.data!.rsvp_share_secret as string;
    const home = `/${slug}/${secret}`;
    // Retired query parameters are ignored on the guest link, whose pages link each other under the secret.
    await guestPage.goto(`${home}?invite=${"A".repeat(43)}&share=${"B".repeat(43)}`);
    await expect(guestPage.getByRole("link", { name: "Details" })).toHaveAttribute("href", `${home}/details`);
    await expect(guestPage.getByRole("link", { name: "RSVP", exact: true })).toHaveAttribute("href", `${home}/rsvp`);
    const unknown = [`/${slug}`, `/${slug}/details`, `/${slug}/rsvp`, `/${slug}/photo`, `/${slug}?share=${secret}`, `/s/${secret}/${slug}/rsvp`,
      `/${slug}/${"x".repeat(43)}`, `/${slug}/${"x".repeat(43)}/rsvp`, `/${slug}/${secret.slice(0, 42)}/rsvp`, `/${slug}/${secret}x`];
    for (const path of unknown) {
      const response = await guestPage.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(guestPage.getByRole("heading", { name: "Page not found" })).toBeVisible();
    }
    for (const path of [`/${slug}/${"x".repeat(43)}`, `/${slug}/${"x".repeat(43)}/rsvp`]) expectPrivate(await guestPage.goto(path));
    expect((await local.admin.from("shared_rsvp_responses").select("id").eq("wedding_id", wedding.data!.id)).data).toEqual([]);

    // The owner is no longer redirected from the names part to the RSVP page.
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
    expect((await page.goto(`/${slug}/rsvp`))?.status()).toBe(404);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});

// F044: couples see whether guests can reply before and after publishing; guests see the deadline exactly as the
// database enforces it, one-reply-each guidance and a clear completion with a separate "Reply for someone else".
test("RSVP readiness, closing date and completion are clear in every state", async ({ page, browser, baseURL }) => {
  const email = `readiness-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const slug = `readiness-e2e-${crypto.randomUUID().slice(0, 8)}`;
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create RSVP test owner");
  const ownerId = created.data.user.id;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const guestPage = await guest.newPage();
  const width = page.viewportSize()!.width;
  const noSideways = async () => expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  try {
    const inserted = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, details_enabled: true, ceremony_venue: "Bath Abbey" }).select("id, rsvp_share_secret").single();
    expect(inserted.error).toBeNull();
    const weddingId = inserted.data!.id as string;
    const home = `/${slug}/${inserted.data!.rsvp_share_secret as string}`;
    const update = async (values: Record<string, unknown>) => expect((await local.admin.from("weddings").update(values).eq("id", weddingId)).error).toBeNull();
    const responses = async () => (await local.admin.from("shared_rsvp_responses").select("responding_name, attending").eq("wedding_id", weddingId).order("responded_at")).data!;

    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Draft with RSVP off (the default): Publish warns without blocking an announcement-only site.
    await openSection(page, "Publish");
    const warning = page.getByRole("note").filter({ hasText: "Guests won’t be able to reply." });
    await expect(warning).toContainText("RSVPs are off. After you publish, guests can view your site but can’t reply until you open RSVPs.");
    await expect(warning.getByRole("link", { name: "Open RSVP settings" })).toHaveAttribute("href", "/dashboard/rsvp");
    await expect(warning).toContainText("or publish as an announcement only");
    await expect(page.getByText("can view your site and reply")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("f044-publish-warning.png"), fullPage: true });
    await openSection(page, "Overview");
    await expect(page.getByRole("article", { name: /RSVPs/ })).toContainText("RSVPs are off. After you publish");
    await openSection(page, "RSVP");
    const section = page.getByRole("region", { name: "RSVP", exact: true });
    await expect(section.getByText("RSVPs off", { exact: true })).toBeVisible();
    await expect(section.getByText("This will be your guest link. It works once your site is published; share it then.", { exact: false })).toBeVisible();
    await expect(section.getByText("Share this one link with everyone", { exact: false })).toHaveCount(0);

    // Turning RSVPs on with a summer closing date explains the exact cutoff, before publishing.
    await section.getByLabel("Accept RSVPs").check();
    await section.getByLabel("Closing date").fill("2027-05-01");
    await section.getByRole("button", { name: "Save RSVP settings" }).click();
    await expect(section.getByRole("status").filter({ hasText: "RSVP settings saved." })).toContainText("RSVPs are on. Guests can reply once your site is published, until 23:59 UTC on 1 May 2027 (00:59 on 2 May in the UK and Ireland).");
    await expect(section.getByText("RSVPs open when published", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("f044-rsvp-settings-draft.png"), fullPage: true });
    await openSection(page, "Publish");
    await expect(page.getByRole("note")).toHaveCount(0);
    await expect(page.getByText("RSVPs open when published", { exact: true })).toBeVisible();
    await expect(page.getByText("anyone who has it can view your site and reply", { exact: false })).toBeVisible();

    // Published: the owner and the guest see the same cutoff.
    expect((await local.grantEntitlement(weddingId, ownerId)).error).toBeNull();
    await update({ published: true });
    await openSection(page, "RSVP");
    await expect(section.getByText("RSVPs open", { exact: true })).toBeVisible();
    await expect(section).toContainText("Guests can reply until 23:59 UTC on 1 May 2027 (00:59 on 2 May in the UK and Ireland).");

    await guestPage.goto(home);
    const reply = guestPage.getByRole("link", { name: "RSVP", exact: true });
    await expect(reply).toHaveAttribute("href", `${home}/rsvp`);
    await reply.click();
    await expect(guestPage).toHaveURL(new URL(`${home}/rsvp`, baseURL).href);
    await expect(guestPage.getByText("Please reply by 1 May 2027.", { exact: true })).toBeVisible();
    await expect(guestPage.getByText("Replies close at 23:59 UTC on 1 May 2027 (00:59 on 2 May in the UK and Ireland).")).toBeVisible();
    await expect(guestPage.getByText("Replying for more than one person? Send one reply each.")).toBeVisible();

    // Validation keeps what the guest typed and says what is missing.
    await guestPage.getByLabel("Your name").fill("Sam Taylor");
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByText("Choose attending or not attending.")).toBeVisible();
    await expect(guestPage.getByLabel("Your name")).toHaveValue("Sam Taylor");
    await guestPage.screenshot({ path: test.info().outputPath("f044-guest-validation.png"), fullPage: true });
    await guestPage.getByLabel("Joyfully accepts").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();

    // Success replaces every pre-submit instruction and moves focus to the confirmation.
    const thanks = guestPage.getByRole("heading", { name: "Thank you" });
    await expect(thanks).toBeFocused();
    await expect(guestPage.getByRole("status")).toContainText("We’ve saved Sam Taylor’s reply: joyfully accepts.");
    await expect(guestPage.getByText("Your reply has been sent.")).toBeVisible();
    for (const gone of ["Please reply by", "Replies close at", "Replying for more than one person?"]) await expect(guestPage.getByText(gone)).toHaveCount(0);
    await expect(guestPage.getByLabel("Your name")).toHaveCount(0);
    await expect(guestPage.getByRole("link", { name: "View the wedding details" })).toHaveAttribute("href", `${home}/details`);
    await guestPage.screenshot({ path: test.info().outputPath("f044-guest-success.png"), fullPage: true });

    // Reply for someone else starts an empty form and saves nothing until it is deliberately sent.
    await guestPage.getByRole("button", { name: "Reply for someone else" }).click();
    await expect(guestPage.getByLabel("Your name")).toHaveValue("");
    await expect(guestPage.getByLabel("Your name")).toBeFocused();
    await expect(guestPage.getByLabel("Joyfully accepts")).not.toBeChecked();
    await expect(thanks).toHaveCount(0);
    await expect(guestPage.getByText("Sam Taylor")).toHaveCount(0);
    expect(await responses()).toEqual([{ responding_name: "Sam Taylor", attending: true }]);
    await guestPage.getByLabel("Your name").fill("Jordan Lee");
    await guestPage.getByLabel("Regretfully declines").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("We’ve saved Jordan Lee’s reply: regretfully declines.");
    expect(await responses()).toEqual([{ responding_name: "Sam Taylor", attending: true }, { responding_name: "Jordan Lee", attending: false }]);

    // Hidden Details are never offered, in the header or after replying.
    await update({ details_enabled: false });
    await guestPage.reload();
    await expect(guestPage.getByRole("link", { name: "Details" })).toHaveCount(0);
    await guestPage.getByLabel("Your name").fill("Robin Hale");
    await guestPage.getByLabel("Joyfully accepts").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("Robin Hale");
    await expect(guestPage.getByRole("link", { name: "View the wedding details" })).toHaveCount(0);
    await update({ details_enabled: true });

    // Winter closing date: the UTC cutoff is the same clock time in the UK and Ireland.
    await update({ rsvp_closes_on: "2026-12-01" });
    await guestPage.goto(`${home}/rsvp`);
    await expect(guestPage.getByText("Please reply by 1 December 2026.", { exact: true })).toBeVisible();
    await expect(guestPage.getByText("Replies close at 23:59 UTC on 1 December 2026 (23:59 in the UK and Ireland).")).toBeVisible();

    // Open, validation and success at this project's width.
    await guestPage.goto(home);
    await expect(guestPage.getByRole("link", { name: "RSVP", exact: true })).toBeVisible();
    await noSideways();
    await guestPage.screenshot({ path: test.info().outputPath(`f044-home-${width}.png`), fullPage: true });
    await guestPage.getByRole("link", { name: "RSVP", exact: true }).click();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByText("Enter your name.")).toBeVisible();
    await noSideways();
    await guestPage.getByLabel("Your name").fill("Guest Open");
    await guestPage.getByLabel("Joyfully accepts").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("heading", { name: "Thank you" })).toBeFocused();
    await noSideways();
    await guestPage.screenshot({ path: test.info().outputPath(`f044-success-${width}.png`), fullPage: true });

    // Closed by date: the date that has passed, in UTC.
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await update({ rsvp_closes_on: yesterday });
    await guestPage.goto(`${home}/rsvp`);
    await expect(guestPage.getByRole("heading", { name: "RSVPs have closed" })).toBeVisible();
    await expect(guestPage.getByText(`Replies closed at ${rsvpDeadline(yesterday).exact}.`, { exact: false })).toBeVisible();
    await expect(guestPage.getByLabel("Your name")).toHaveCount(0);
    await noSideways();
    await guestPage.screenshot({ path: test.info().outputPath(`f044-closed-${width}.png`), fullPage: true });
    // The closed notice replaces the form, so check it fits in every theme; each needs only a reload.
    for (const { id } of themes) {
      await update({ theme: id });
      await guestPage.reload();
      await expect(guestPage.getByRole("heading", { name: "RSVPs have closed" })).toBeVisible();
      await noSideways();
    }
    await update({ theme: "minimal" });
    await openSection(page, "RSVP");
    await expect(section.getByText("RSVPs closed", { exact: true })).toBeVisible();
    await expect(section).toContainText(`RSVPs closed at ${rsvpDeadline(yesterday).exact}. Guests can still view your site but can’t reply.`);
    await expect(section).toContainText("They can view your site, but cannot reply while RSVPs aren’t open.");
    await openSection(page, "Publish");
    await expect(page.locator("#guest-link")).toContainText("Anyone who has it can view your site, so share it only with your guests.");
    await expect(page.locator("#guest-link")).not.toContainText("can view your site and reply");

    // Disabled: no date is shown and no RSVP navigation or action is offered.
    await update({ rsvp_enabled: false });
    await guestPage.goto(home);
    await expect(guestPage.getByRole("link", { name: /RSVP/ })).toHaveCount(0);
    await guestPage.goto(`${home}/rsvp`);
    await expect(guestPage.getByRole("heading", { name: "RSVPs aren’t open" })).toBeVisible();
    await expect(guestPage.getByText("UTC")).toHaveCount(0);
    await guestPage.screenshot({ path: test.info().outputPath(`f044-disabled-${width}.png`), fullPage: true });

    // Expired: guests get the generic 404 and the couple is told the site is offline.
    expect((await local.admin.from("stripe_payments").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("wedding_id", weddingId)).error).toBeNull();
    expect((await guest.request.get(`${home}/rsvp`)).status()).toBe(404);
    await openSection(page, "Overview");
    await expect(page.getByRole("article", { name: "Site status" })).toContainText("Offline");
    await openSection(page, "RSVP");
    await expect(section.getByText("Site offline", { exact: true })).toBeVisible();
    await expect(section).toContainText("Your site is no longer online, so guests can’t view it or reply.");
    await expect(section).toContainText("This is your existing guest link. It will work again if you purchase a new site period.");
    await expect(section.getByText("Currently offline", { exact: true })).toBeVisible();
    await openSection(page, "Publish");
    await expect(page.getByText("Your published site is offline because its purchase is no longer active.")).toBeVisible();
    await expect(page.getByText("This is your existing guest link. It will work again if you purchase a new site period.", { exact: false })).toBeVisible();
    await expect(page.getByText("Works once published")).toHaveCount(0);
    expect((await responses()).length).toBe(4);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
