import { expect, test, type Page, type Response } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
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
  test.setTimeout(120_000);
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
    await expect(section.getByRole("heading", { name: "One link for all guests" })).toBeVisible();
    const shareUrl = await section.getByLabel("Your shared RSVP link").inputValue();
    expect(shareUrl).toMatch(new RegExp(`^/s/[A-Za-z0-9_-]{43}/${slug}/rsvp$`));
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseURL!).origin });
    await section.getByRole("button", { name: "Copy full link" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(shareUrl, baseURL).href);
    await page.screenshot({ path: test.info().outputPath("shared-rsvp-workspace.png"), fullPage: true });

    expectPrivate(await guestPage.goto(shareUrl));
    await expect(guestPage.getByRole("heading", { name: "RSVP" })).toBeVisible();
    await expect(guestPage.getByText("Please enter your name and answer below.")).toBeVisible();
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
    const sam = responseList.getByRole("listitem").filter({ hasText: "Sam Taylor" });
    await sam.getByText("Correct or remove response").click();
    await sam.getByLabel("Responding name").fill("Sam T.");
    await sam.getByLabel("Not attending").check();
    await sam.getByRole("button", { name: "Save correction" }).click();
    await expect(responseList.getByText("Sam T.")).toBeVisible();
    await responseList.screenshot({ path: test.info().outputPath("shared-rsvp-responses.png") });
    const jordan = responseList.getByRole("listitem").filter({ hasText: "Jordan Lee" });
    await jordan.getByText("Correct or remove response").click();
    await jordan.getByLabel("Remove this response from the list and totals").check();
    await jordan.getByRole("button", { name: "Remove response" }).click();
    await expect(responseList.getByText("Jordan Lee")).toHaveCount(0);
    for (const theme of ["minimal", "romantic", "bold"]) {
      expect((await local.admin.from("weddings").update({ theme }).eq("id", wedding.data!.id)).error).toBeNull();
      await guestPage.goto(shareUrl);
      await expect(guestPage.locator(".wedding-shell")).toHaveAttribute("data-theme", theme);
      for (const width of [320, 390, 1440]) {
        await guestPage.setViewportSize({ width, height: 900 });
        expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await guestPage.screenshot({ path: test.info().outputPath(`shared-rsvp-${theme}.png`), fullPage: true });
    }
    await openSection(page, "RSVP");
    const updated = page.getByRole("region", { name: "RSVP", exact: true });
    await updated.getByLabel("Accept RSVPs").uncheck();
    await updated.getByRole("button", { name: "Save RSVP settings" }).click();
    await expect(updated.getByRole("status").filter({ hasText: "RSVP is closed" })).toBeVisible();
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { name: "RSVP is closed" })).toBeVisible();
    await updated.getByLabel("Replace this link and stop previously shared copies from working").check();
    await updated.getByRole("button", { name: "Replace shared link" }).click();
    await expect(updated.getByRole("status").filter({ hasText: "replaced" })).toBeVisible();
    const replacement = await updated.getByLabel("Your shared RSVP link").inputValue();
    expect(replacement).not.toBe(shareUrl);
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();
    await guestPage.goto(replacement);
    await expect(guestPage.getByRole("heading", { name: "RSVP is closed" })).toBeVisible();
    expect((await local.admin.from("shared_rsvp_responses").select("id").eq("wedding_id", wedding.data!.id)).data).toHaveLength(1);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});

test("previously issued individual links still support correction and revocation", async ({ page, browser, baseURL }) => {
  const email = `legacy-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const slug = `legacy-e2e-${crypto.randomUUID()}`;
  const token = randomBytes(32).toString("base64url");
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create RSVP test owner");
  const ownerId = created.data.user.id;
  const guest = await browser.newContext({ baseURL });
  const guestPage = await guest.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, rsvp_enabled: true }).select("id").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    const invitation = await local.admin.from("rsvp_invitations").insert({ wedding_id: wedding.data!.id, invite_name: "Legacy Guest", token_hash: createHash("sha256").update(token).digest("hex") }).select("id").single();
    expect(invitation.error).toBeNull();
    await guestPage.goto(`/${slug}/rsvp?invite=${token}`);
    await expect(guestPage.getByText("This invitation is for Legacy Guest.")).toBeVisible();
    await guestPage.getByLabel("Your name").fill("Legacy Guest");
    await guestPage.getByLabel("Joyfully accepts").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("saved");
    await guestPage.reload();
    await expect(guestPage.getByLabel("Your name")).toHaveValue("Legacy Guest");
    await guestPage.getByLabel("Regretfully declines").check();
    await guestPage.getByRole("button", { name: "Update RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("saved");

    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await openSection(page, "Guests");
    const legacy = page.getByRole("region", { name: "Who’s coming" }).getByRole("region", { name: "Earlier individual invitations" });
    await expect(legacy.getByText("Not attending")).toBeVisible();
    await legacy.getByRole("button", { name: "Revoke link" }).click();
    await expect(legacy.getByText("Revoked")).toBeVisible();
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
