import { expect, test } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();

test("owner edits and previews Details while guests see only enabled published content", async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  const email = `details-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const slug = `details-e2e-${crypto.randomUUID()}`;
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create Details browser-test owner");
  const ownerId = created.data.user.id;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const guestPage = await guest.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug }).select("id").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.getByRole("link", { name: "Details" })).toHaveCount(0);
    const hiddenResponse = await guestPage.goto(`/${slug}/details`);
    expect(hiddenResponse?.status()).toBe(404);

    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const section = page.getByRole("region", { name: "Wedding Details" });
    await expect(section).toBeVisible();
    await section.getByRole("link", { name: "Preview saved Details" }).click();
    await expect(page.getByText("No details have been saved yet.")).toBeVisible();
    await expect(page.getByText("hidden from guests")).toBeVisible();
    await page.getByRole("link", { name: "Back to workspace" }).click();

    await section.getByLabel("Show Details page").check();
    await section.locator('input[name="ceremony_venue"]').fill("The Old Hall");
    await section.locator('input[name="ceremony_time"]').fill("1:30pm");
    await section.locator('input[name="ceremony_url"]').fill("javascript:alert(1)");
    await section.getByLabel("Travel and transport").fill("A shuttle leaves the station at 12:45pm.");
    await section.getByRole("button", { name: "Add a question" }).click();
    await section.getByLabel("Question 1").fill("Can children attend?");
    await section.getByRole("button", { name: "Save live Details" }).click();
    await expect(section.getByText(/Please check the highlighted fields/)).toBeVisible();
    await expect(section.getByLabel("Show Details page")).toBeChecked();
    await expect(section.getByText("You have unsaved Details changes.")).toBeVisible();
    await expect(section.getByLabel("Travel and transport")).toHaveValue("A shuttle leaves the station at 12:45pm.");
    await section.locator('input[name="ceremony_url"]').fill("https://example.test/ceremony");
    await section.getByLabel("Answer 1").fill("Please check your invitation.");
    await section.getByRole("button", { name: "Save live Details" }).click();
    await expect(section.getByRole("status")).toContainText("shown on your live site");
    await expect(section.getByLabel("Show Details page")).toBeChecked();
    await expect(section.getByText("You have unsaved Details changes.")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("details-workspace.png"), fullPage: true });

    await page.goto("/dashboard/preview");
    await expect(page.getByText("Private preview · saved content", { exact: true })).toBeVisible();
    await expect(page.getByText("Previewing Modern Minimal · current theme", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Back to workspace" }).click();

    await guestPage.goto(`/${slug}`);
    await guestPage.getByRole("link", { name: "Details" }).click();
    await expect(guestPage).toHaveURL(new RegExp(`/${slug}/details$`));
    await expect(guestPage.getByRole("heading", { name: "Wedding details" })).toBeVisible();
    await expect(guestPage.getByText("The Old Hall")).toBeVisible();
    await expect(guestPage.getByText("A shuttle leaves the station at 12:45pm.")).toBeVisible();
    await expect(guestPage.getByText("Please check your invitation.")).toBeVisible();
    await expect(guestPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    for (const theme of ["minimal", "romantic", "bold"]) {
      expect((await local.admin.from("weddings").update({ theme }).eq("owner_id", ownerId)).error).toBeNull();
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-shell")).toHaveAttribute("data-theme", theme);
      expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await guestPage.screenshot({ path: test.info().outputPath(`details-${theme}.png`), fullPage: true });
    }

    await page.reload();
    const updatedSection = page.getByRole("region", { name: "Wedding Details" });
    await expect(updatedSection.getByLabel("Show Details page")).toBeChecked();
    await updatedSection.getByLabel("Show Details page").uncheck();
    await updatedSection.getByRole("button", { name: "Save live Details" }).click();
    await expect(updatedSection.getByRole("status")).toContainText("hidden from guests");
    await expect(updatedSection.getByLabel("Show Details page")).not.toBeChecked();
    await page.reload();
    await expect(page.getByRole("region", { name: "Wedding Details" }).getByLabel("Show Details page")).not.toBeChecked();
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.getByRole("link", { name: "Details" })).toHaveCount(0);
    expect((await guestPage.goto(`/${slug}/details`))?.status()).toBe(404);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
