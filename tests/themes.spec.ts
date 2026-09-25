import { expect, test } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

const themeIds = themes.map(({ id }) => id);

const local = localSupabase();
test("theme preview is private and applying preserves the live wedding", async ({ page, browser, baseURL }) => {
  // Previews every theme; this took up to 1.3 minutes on the CI runner's development server.
  test.setTimeout(150_000);
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
    const wedding = await local.admin.from("weddings").insert(content).select("id, rsvp_share_secret").single();
    expect(wedding.error).toBeNull();
    const home = `/${slug}/${wedding.data!.rsvp_share_secret}`;
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await openWorkspaceSection(page, "Design");
    await expect(page.getByRole("heading", { name: "Your wedding style" })).toBeVisible();
    const currentTheme = page.getByRole("region", { name: "Theme" });
    await expect(currentTheme).toContainText("Modern Minimal");
    await page.screenshot({ path: test.info().outputPath("design-theme.png"), fullPage: true });
    await currentTheme.getByRole("link", { name: /Change theme/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/preview$/);
    // Choosing a theme previews it immediately, including by keyboard, without saving.
    await page.getByRole("radio", { name: /Modern Minimal/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /Warm & Romantic/ })).toBeChecked();
    await expect(page).toHaveURL(/\/dashboard\/preview\?theme=romantic$/);
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "romantic");
    await page.screenshot({ path: test.info().outputPath("theme-picker.png"), fullPage: true });
    await guestPage.goto(home);
    await expect(guestPage.locator(".wedding-shell")).toHaveAttribute("data-theme", "minimal");
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await openWorkspaceSection(page, "Design");
    await expect(currentTheme).toContainText("Modern Minimal");
    for (const { id, name } of [...themes.slice(1), themes[0]]) {
      await currentTheme.getByRole("link", { name: /Change theme/ }).click();
      await page.getByRole("radio", { name: new RegExp(name) }).check();
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
      await openWorkspaceSection(page, "Design");
      await expect(page).toHaveURL(/\/dashboard\/design$/);
      await page.reload();
      await expect(currentTheme).toContainText(name);
    }
    const saved = await local.admin.from("weddings").select(Object.keys(content).join(",")).eq("owner_id", ownerId).single();
    expect(saved.data).toEqual(content);
    // Reuse the licensed fixture image through an intercepted photo response, without storage side effects.
    const photo = await readFile("fixtures/lake-como.jpg");
    const row = await local.admin.from("weddings").select("id").eq("owner_id", ownerId).single();
    const path = `${row.data!.id}/${crypto.randomUUID()}.webp`;
    await guestPage.route(`**${home}/photo`, (route) => route.fulfill({ contentType: "image/jpeg", body: photo }));
    for (const id of themeIds) {
      expect((await local.admin.from("weddings").update({ theme: id, photo_path: path }).eq("owner_id", ownerId)).error).toBeNull();
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-photo img")).toBeVisible();
      await guestPage.screenshot({ path: test.info().outputPath(`${id}-photo.png`), fullPage: true });
    }
    await guestPage.unroute(`**${home}/photo`);
    await guestPage.route(`**${home}/photo`, (route) => route.abort());
    for (const id of themeIds) {
      expect((await local.admin.from("weddings").update({ theme: id, first_name: "Alexandria".repeat(8), second_name: "Montgomery".repeat(8), message: "A long personal message. ".repeat(20).trim() }).eq("owner_id", ownerId)).error).toBeNull();
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-photo img")).toHaveCount(0);
      await expect(guestPage.getByRole("heading", { name: "Save the Date" })).toBeVisible();
      expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await guestPage.screenshot({ path: test.info().outputPath(`${id}-long-failed-photo.png`), fullPage: true });
    }
    // The overlay must protect the whole message even when valid newlines make it very tall.
    await guestPage.unroute(`**${home}/photo`);
    const darkPhoto = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#000" } }).png().toBuffer();
    await guestPage.route(`**${home}/photo`, route => route.fulfill({ contentType: "image/png", body: darkPhoto }));
    expect((await local.admin.from("weddings").update({ theme: "minimal", message: "With love\n".repeat(50).trim() }).eq("owner_id", ownerId)).error).toBeNull();
    await guestPage.reload();
    await expect(guestPage.locator(".wedding-photo img")).toHaveJSProperty("naturalWidth", 400);
    const longMessageScreenshot = await guestPage.screenshot({ path: test.info().outputPath("minimal-multiline-dark-photo.png"), fullPage: true });
    // Sample the background just below the last message line, away from glyphs.
    const samplePoint = await guestPage.locator(".wedding-message").evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return { x: bounds.left + scrollX + bounds.width / 2, y: bounds.bottom + scrollY + 3, pageWidth: document.documentElement.clientWidth };
    });
    const scale = (await sharp(longMessageScreenshot).metadata()).width! / samplePoint.pageWidth;
    const rgb = await sharp(longMessageScreenshot).extract({ left: Math.floor(samplePoint.x * scale), top: Math.floor(samplePoint.y * scale), width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    expect(Math.min(...rgb.subarray(0, 3)), "Ivory contrast backing continues past the final line").toBeGreaterThan(200);
    expect((await local.admin.from("weddings").update({ theme: "bold" }).eq("owner_id", ownerId)).error).toBeNull();
    await page.goto("/dashboard/preview?theme=unknown");
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "bold");
    await guestPage.goto("/dashboard/preview?theme=romantic");
    await expect(guestPage).toHaveURL(/account\/sign-in/);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
