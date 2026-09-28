// Frame-exact renderer for the launch film.
//   node render.mjs stills out/ 1.2 5.5 12      -> PNG stills at given seconds
//   node render.mjs video out/film.mp4 [fps] [from] [to]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.STD_ROOT || path.resolve(here, "../../../../..");
const { chromium } = require(path.join(ROOT, "node_modules/playwright"));
const ffmpeg = require("ffmpeg-static");

const [mode, out, ...rest] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--disable-lcd-text", "--force-color-profile=srgb", "--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("console:", m.text()); });
await page.goto(pathToFileURL(path.join(here, "index.html")).href);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const cdp = await page.context().newCDPSession(page);
const grab = async (format, quality) => {
  const { data } = await cdp.send("Page.captureScreenshot", { format, quality, optimizeForSpeed: format === "jpeg", captureBeyondViewport: false });
  return Buffer.from(data, "base64");
};

if (mode === "stills") {
  fs.mkdirSync(out, { recursive: true });
  for (const s of rest) {
    const t = +s;
    // play up to t in steps so the timeline passes through the same states as a real render
    await page.evaluate((t) => window.__seek(t), t);
    fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(6, "0")}.png`), await grab("png"));
  }
} else if (mode === "cues") {
  fs.writeFileSync(out, JSON.stringify(await page.evaluate(() => ({ duration: window.__duration, speed: window.__speed, cues: window.__cues })), null, 1));
} else if (mode === "video") {
  const fps = +(rest[0] || 60);
  const duration = await page.evaluate(() => window.__duration);
  const from = +(rest[1] || 0), to = +(rest[2] || duration);
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const ff = spawn(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-tune", "film", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = n0; f < n1; f++) {
    await page.evaluate(([t, f]) => window.__seek(t, f), [f / fps, f]);
    const buf = await grab("jpeg", 96);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 120 === 0) console.log(`frame ${f}/${n1} ${(f / fps).toFixed(1)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("done", out, ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
await browser.close();
