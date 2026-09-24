// Regenerates the marketing phone images from the real fictional examples.
// Usage: npm run marketing:previews [-- http://127.0.0.1:3000 [theme ...]]  (app must be running)
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const allThemes = ["minimal", "romantic", "bold", "terracotta", "heather", "coastal", "riviera", "alcantara", "countryside", "velvet", "black-tie", "evening-gold"];
const themes = process.argv.length > 3 ? process.argv.slice(3) : allThemes;
const outDir = "public/media/themes";

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const theme of themes) {
    await page.goto(new URL(`/examples/${theme}`, base).href, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: ".example-banner { display: none !important; } *, *::before, *::after { animation: none !important; transition: none !important; }" });
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".wedding-photo img").evaluate((img) => img.complete || new Promise((resolve) => img.addEventListener("load", resolve, { once: true })));
    const png = await page.screenshot();
    await sharp(png).resize({ width: 600 }).webp({ quality: 82 }).toFile(`${outDir}/${theme}.webp`);
    console.log(`Captured ${outDir}/${theme}.webp`);
  }
} finally {
  await browser.close();
}
