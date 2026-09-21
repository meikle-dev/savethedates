import { expect, test } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();

test("owner creates an invitation and a guest submits, corrects, and sees closure", async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  const email = `rsvp-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const slug = `rsvp-e2e-${crypto.randomUUID()}`;
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create RSVP browser-test owner");
  const ownerId = created.data.user.id;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const guestPage = await guest.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug }).select("id").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.getByRole("link", { name: "RSVP" })).toHaveCount(0);

    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const section = page.getByRole("region", { name: "RSVP" });
    await expect(section).toBeVisible();
    await section.getByLabel("Accept RSVPs").check();
    await section.getByRole("button", { name: "Save RSVP settings" }).click();
    await expect(section.getByRole("status")).toContainText("enabled");
    await section.getByLabel("Invitation name").fill("Sam Taylor");
    await section.getByRole("button", { name: "Create link" }).click();
    await expect(section.getByText("Copy this private link now")).toBeVisible();
    const inviteUrl = await section.getByLabel("New private link").inputValue();
    expect(inviteUrl).toMatch(new RegExp(`^/${slug}/rsvp\\?invite=`));
    await page.screenshot({ path: test.info().outputPath("rsvp-workspace.png"), fullPage: true });

    await guestPage.goto(inviteUrl);
    await expect(guestPage.getByRole("heading", { name: "RSVP" })).toBeVisible();
    await expect(guestPage.getByText("This invitation is for Sam Taylor.")).toBeVisible();
    await guestPage.getByLabel("Your name").fill("Sam Taylor");
    await guestPage.getByLabel("Joyfully accepts").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("saved");
    await guestPage.reload();
    await expect(guestPage.getByLabel("Your name")).toHaveValue("Sam Taylor");
    await guestPage.getByLabel("Regretfully declines").check();
    await guestPage.getByLabel("Your name").fill("Sam T.");
    await guestPage.getByRole("button", { name: "Update RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("saved");

    await page.reload();
    const updatedSection = page.getByRole("region", { name: "RSVP" });
    await expect(updatedSection.getByText("Not attending")).toBeVisible();
    await expect(updatedSection.getByText(/Response from Sam T\./)).toBeVisible();
    for (const theme of ["minimal", "romantic", "bold"]) {
      expect((await local.admin.from("weddings").update({ theme }).eq("owner_id", ownerId)).error).toBeNull();
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-shell")).toHaveAttribute("data-theme", theme);
      expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const submit = guestPage.getByRole("button", { name: "Update RSVP" });
      await submit.focus();
      const focusContrast = await submit.evaluate((button) => {
        const luminance = (color: string) => {
          const [r, g, b] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const outline = luminance(getComputedStyle(button).outlineColor);
        const surface = luminance(getComputedStyle(button.closest(".rsvp-card")!).backgroundColor);
        return (Math.max(outline, surface) + 0.05) / (Math.min(outline, surface) + 0.05);
      });
      expect(focusContrast, `${theme} keyboard focus has at least 3:1 contrast`).toBeGreaterThanOrEqual(3);
      await guestPage.screenshot({ path: test.info().outputPath(`rsvp-${theme}.png`), fullPage: true });
    }

    await updatedSection.getByLabel("Accept RSVPs").uncheck();
    await updatedSection.getByRole("button", { name: "Save RSVP settings" }).click();
    await expect(updatedSection.getByRole("status")).toContainText("closed");
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { name: "RSVP is closed" })).toBeVisible();
    await expect(guestPage.getByText("Saved response: Sam T. · Not attending")).toBeVisible();
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.getByRole("link", { name: "RSVP" })).toHaveCount(0);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
