// Renders every static image in statics.html and assembles docs/marketing-material/channels.
//   node channels.mjs                 everything (build the videos first: node build.mjs, node build.mjs ad, node build.mjs ad45)
//   node channels.mjs --only pinterest   just the files whose path starts with "pinterest"
//   node channels.mjs --out some/dir     write somewhere else (for previews)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.STD_ROOT || path.resolve(here, "../../..");
const { chromium } = require(path.join(ROOT, "node_modules/playwright"));
const sharp = require(path.join(ROOT, "node_modules/sharp"));
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = path.resolve(arg("--out") || path.join(here, "../channels"));
const ONLY = arg("--only") || "";
const VIDEOS = path.resolve(here, "../marketing-videos");

const write = (rel, buf) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); };
const copy = (rel, from) => {
  if (!rel.startsWith(ONLY)) return;
  const src = path.join(VIDEOS, from);
  if (!fs.existsSync(src)) { console.warn("missing video, skipped:", from); return; }
  const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(src, f);
};
const copyOut = (rel, fromRel) => { if (rel.startsWith(ONLY) && fs.existsSync(path.join(OUT, fromRel))) { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(path.join(OUT, fromRel), f); } };

// 1. Static images
const browser = await chromium.launch({ args: ["--disable-lcd-text", "--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
const url = pathToFileURL(path.join(here, "statics.html")).href;
await page.goto(url);
await page.waitForFunction(() => window.__ready === true);
const assets = (await page.evaluate(() => window.__assets)).filter((a) => a.out.startsWith(ONLY));
for (const a of assets) {
  await page.setViewportSize({ width: a.w, height: a.h });
  await page.goto(`${url}?i=${a.i}`);
  await page.waitForFunction(() => window.__ready === true);
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: a.w, height: a.h } });
  write(a.out, a.fmt === "png" ? png : await sharp(png).jpeg({ quality: 92, chromaSubsampling: "4:4:4", mozjpeg: true }).toBuffer());
  console.log(a.out);
}
await browser.close();

// 2. Profile pictures and square logo from the app icon (navy fills the rounded corners for circular crops)
const icon = path.join(ROOT, "public/icon-512.png");
const square = async (size) => sharp({ create: { width: size, height: size, channels: 4, background: "#0B2A3D" } })
  .composite([{ input: await sharp(icon).resize(size, size, { kernel: "lanczos3" }).toBuffer() }]).png().toBuffer();
for (const [rel, size] of [["instagram/profile/profile-picture-1080.png", 1080], ["facebook/page-setup/profile-picture-1080.png", 1080], ["pinterest/profile/profile-picture-1080.png", 1080], ["tiktok/profile/profile-picture-1080.png", 1080], ["google-ads/logos/logo-square-1200x1200.png", 1200]]) {
  if (rel.startsWith(ONLY)) write(rel, await square(size));
}

// 3. Reuse images across channels (same sizes, same files)
const posts = fs.existsSync(path.join(OUT, "instagram/feed-posts")) ? fs.readdirSync(path.join(OUT, "instagram/feed-posts")) : [];
for (const f of posts) {
  copyOut(`facebook/posts/${f}`, `instagram/feed-posts/${f}`);
  if (!f.startsWith("05") && !f.startsWith("06")) {
    copyOut(`instagram/ads/images/feed-4x5/${f}`, `instagram/feed-posts/${f}`);
    copyOut(`facebook/ads/images/feed-4x5/${f}`, `instagram/feed-posts/${f}`);
  }
}
for (const f of ["01-your-wedding-website.jpg", "02-twelve-designs.jpg", "03-rsvps-without-the-chaos.jpg", "05-price-39-once.jpg"]) {
  copyOut(`instagram/ads/images/stories-9x16/${f}`, `instagram/stories/${f}`);
  copyOut(`facebook/ads/images/stories-9x16/${f}`, `instagram/stories/${f}`);
}

// 4. Videos
const AD = "savethedates-ad-9x16-10s", AD45 = "savethedates-ad-4x5-10s", FILM = "savethedates-launch-film-1080p";
const vids = {
  "instagram/reels": [AD, `${AD}-no-music`, `${AD}-poster`],
  "instagram/ads/videos": [AD, AD45],
  "facebook/ads/videos": [AD, AD45],
  "facebook/videos": [FILM, `${FILM}-poster`],
  "pinterest/video-pins": [AD, `${AD}-poster`],
  "google-ads/youtube": [FILM, AD],
  "tiktok/videos": [AD, `${AD}-no-music`, `${AD}-poster`],
};
for (const [dir, names] of Object.entries(vids)) for (const n of names) {
  const file = n.endsWith("-poster") ? `${n}.jpg` : `${n}.mp4`;
  copy(`${dir}/${file.replace(/-poster\.jpg$/, "-cover.jpg")}`, file);
}
console.log(`done: ${assets.length} images -> ${OUT}`);
