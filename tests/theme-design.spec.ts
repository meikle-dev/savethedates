import { expect, test } from "@playwright/test";
import sharp from "sharp";

for (const theme of ["minimal", "romantic", "bold"]) {
  test(`${theme} guest design stays readable across sizes and image failures`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/examples/${theme}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".wedding-photo img")).toHaveJSProperty("naturalWidth", 1400);
    await expect(page.locator(".wedding-photo img")).toHaveCSS("object-position", "46% 52%");
    await expect(page.getByRole("heading", { name: "Save the Date" })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`${theme}-landing.png`), fullPage: true });
    await page.getByRole("navigation", { name: "Wedding site" }).getByRole("link", { name: "Details", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Wedding details" })).toBeVisible();
    await expect(page.locator(".wedding-photo img")).toHaveJSProperty("naturalWidth", 1400);
    await expect(page.locator(".wedding-photo img")).toHaveCSS("object-position", "54% 58%");
    await page.screenshot({ path: test.info().outputPath(`${theme}-details.png`), fullPage: true });
    for (const route of ["", "/details"]) {
      await page.goto(`/examples/${theme}${route}`);
      for (const width of [320, 390, 620, 621, 768, 900, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${theme}${route} fits ${width}px`).toBe(true);
      }
    }
    // A failed user photo must not remove information or collapse either page.
    await page.route("**/media/lake-como-editorial.webp", route => route.abort());
    await page.setViewportSize({ width: 320, height: 800 });
    for (const route of ["", "/details"]) {
      await page.goto(`/examples/${theme}${route}`);
      await expect(page.locator(".wedding-photo")).toHaveAttribute("data-has-photo", "false");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`${theme}${route ? "-details" : ""}-failed-photo-320.png`), fullPage: true });
    }
    await page.unroute("**/media/lake-como-editorial.webp");
    // Capture both extremes for contrast review: real uploads need not resemble the example.
    for (const background of ["#000000", "#ffffff"]) {
      const body = await sharp({ create: { width: 400, height: 400, channels: 3, background } }).png().toBuffer();
      await page.route("**/media/lake-como-editorial.webp", route => route.fulfill({ contentType: "image/png", body }));
      await page.goto(`/examples/${theme}`);
      await expect(page.locator(".wedding-photo img")).toHaveJSProperty("naturalWidth", 400);
      await page.screenshot({ path: test.info().outputPath(`${theme}-photo-${background.slice(1)}.png`), fullPage: true });
      await page.unroute("**/media/lake-como-editorial.webp");
    }
  });
}
