import { expect, test } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";
import sharp from "sharp";

const themeIds = themes.map(({ id }) => id);

for (const theme of themeIds) {
  test(`${theme} guest design stays readable across sizes and image failures`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/examples/${theme}`);
    await page.evaluate(() => document.fonts.ready);
    // CSS decoration has no img error UI: decode its actual source to catch broken assets.
    const decoration = page.locator(".wedding-footer > .botanical-art");
    await expect(decoration).toHaveAttribute("aria-hidden", "true");
    await expect(decoration).toHaveCSS("pointer-events", "none");
    // Alcantara deliberately has no illustration: stitching and cognac rules replace it.
    // Every illustrated theme uses a supplied 768×1152 (2:3) transparent WebP botanical.
    const webp = (name: string) => ({ path: `/assets/wedding/high-fid-graphics/${name}.webp`, width: 768, height: 1152 });
    const asset = {
      minimal: webp("minimal-olive"), romantic: webp("romantic-rose"), bold: webp("bold-laurel"), terracotta: webp("mediterranean-citrus"), heather: webp("meadow-wildflower"),
      coastal: webp("coastal-sea-holly"), riviera: webp("riviera-lemon-blossom"), alcantara: null, countryside: webp("autumn-dahlia"),
      velvet: webp("velvet-claret-rose"), "black-tie": webp("black-tie-ivory-orchid"), "evening-gold": webp("winter-hellebore"),
    }[theme];
    if (asset) {
      const artwork = await decoration.evaluate(async element => {
        const source = getComputedStyle(element).backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
        if (!source) throw new Error("Theme artwork is missing");
        const image = new Image();
        image.src = source;
        await image.decode();
        return { path: new URL(source).pathname, width: image.naturalWidth, height: image.naturalHeight };
      });
      expect(artwork).toEqual(asset);
    } else await expect(decoration).toBeHidden();
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
