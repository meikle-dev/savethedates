import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();
test("theme preview is private and applying preserves the live wedding", async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  const email = `themes-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const { data, error } = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error("Cannot create theme test owner");
  const ownerId = data.user.id;
  const slug = `themes-${crypto.randomUUID()}`;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize(), reducedMotion: "reduce" });
  const guestPage = await guest.newPage();
  const content = { owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath, England", message: "We would love you to be part of our special day.", slug };
  try {
    const wedding = await local.admin.from("weddings").insert(content).select("id").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your wedding style" })).toBeVisible();
    await page.getByRole("radio", { name: /Modern Minimal/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /Warm & Romantic/ })).toBeChecked();
    await page.screenshot({ path: test.info().outputPath("theme-picker.png"), fullPage: true });
    await page.getByRole("button", { name: "Preview theme" }).click();
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "romantic");
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.locator(".wedding-shell")).toHaveAttribute("data-theme", "minimal");
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await expect(page.getByRole("radio", { name: /Modern Minimal/ })).toBeChecked();
    for (const [id, name] of [["romantic", "Warm & Romantic"], ["bold", "Modern & Bold"], ["minimal", "Modern Minimal"]]) {
      await page.getByRole("radio", { name: new RegExp(name) }).check();
      await page.getByRole("button", { name: "Preview theme" }).click();
      await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", id);
      await page.getByRole("button", { name: "Apply theme", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Theme applied to your live wedding site");
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-shell")).toHaveAttribute("data-theme", id);
      await expect(guestPage.getByText(content.location, { exact: true })).toBeVisible();
      await expect(guestPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await guestPage.screenshot({ path: test.info().outputPath(`${id}-no-photo.png`), fullPage: true });
      expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Back to workspace" }).click();
      await page.reload();
      await expect(page.getByRole("radio", { name: new RegExp(name) })).toBeChecked();
    }
    const saved = await local.admin.from("weddings").select(Object.keys(content).join(",")).eq("owner_id", ownerId).single();
    expect(saved.data).toEqual(content);
    // Reuse the licensed fixture image through an intercepted photo response, without storage side effects.
    const photo = await readFile("fixtures/lake-como.jpg");
    const row = await local.admin.from("weddings").select("id").eq("owner_id", ownerId).single();
    const path = `${row.data!.id}/${crypto.randomUUID()}.webp`;
    await guestPage.route(`**/${slug}/photo`, (route) => route.fulfill({ contentType: "image/jpeg", body: photo }));
    for (const id of ["minimal", "romantic", "bold"]) {
      expect((await local.admin.from("weddings").update({ theme: id, photo_path: path }).eq("owner_id", ownerId)).error).toBeNull();
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-photo img")).toBeVisible();
      await guestPage.screenshot({ path: test.info().outputPath(`${id}-photo.png`), fullPage: true });
    }
    await guestPage.unroute(`**/${slug}/photo`);
    await guestPage.route(`**/${slug}/photo`, (route) => route.abort());
    for (const id of ["minimal", "romantic", "bold"]) {
      expect((await local.admin.from("weddings").update({ theme: id, first_name: "Alexandria".repeat(8), second_name: "Montgomery".repeat(8), message: "A long personal message. ".repeat(20).trim() }).eq("owner_id", ownerId)).error).toBeNull();
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-photo img")).toHaveCount(0);
      await expect(guestPage.getByRole("heading", { name: "Save the Date" })).toBeVisible();
      expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await guestPage.screenshot({ path: test.info().outputPath(`${id}-long-failed-photo.png`), fullPage: true });
    }
    await page.goto("/dashboard/preview?theme=unknown");
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "bold");
    await guestPage.goto("/dashboard/preview?theme=romantic");
    await expect(guestPage).toHaveURL(/account\/sign-in/);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
