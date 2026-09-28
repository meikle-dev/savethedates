// Prepares resized assets for the launch film from the marketing screenshots.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.STD_ROOT || path.resolve(here, "../../../../..");
const sharp = require(path.join(ROOT, "node_modules/sharp"));
const IMG = path.join(ROOT, "docs/marketing-material/marketing-context/images");
const OUT = path.resolve(here, process.argv[2] || "assets");
fs.mkdirSync(OUT, { recursive: true });
const themes = ["01-minimal","02-romantic","03-bold","04-terracotta","05-heather","06-coastal","07-riviera","08-alcantara","09-countryside","10-velvet","11-black-tie","12-evening-gold"];
const jobs = [];
for (const t of themes) {
  for (const p of ["save-the-date", "invitation", "rsvp", "details"]) {
    jobs.push([`02-guest-pages-by-theme/${t}/${p}-mobile.png`, `${t}-${p}.jpg`, 780]);
    jobs.push([`02-guest-pages-by-theme/${t}/${p}-mobile.png`, `${t}-${p}-sm.jpg`, 360]);
  }
  jobs.push([`02-guest-pages-by-theme/${t}/details-mobile-full.png`, `${t}-details-full.jpg`, 780]);
  fs.copyFileSync(path.join(IMG, `06-link-preview-cards/${t}.jpg`), path.join(OUT, `card-${t}.jpg`));
}
for (const [src, dst, w] of jobs) {
  await sharp(path.join(IMG, src)).resize({ width: w, kernel: "lanczos3" }).jpeg({ quality: 92, mozjpeg: true }).toFile(path.join(OUT, dst));
}
// Olive sprig from the real RSVP page (Modern Minimal).
await sharp(path.join(IMG, "03-guest-rsvp-journey/2-rsvp-start-mobile.png"))
  .extract({ left: 470, top: 460, width: 230, height: 180 }).png().toFile(path.join(OUT, "sprig.png"));
for (const f of ["cormorant-garamond-latin-regular.woff2", "cormorant-garamond-latin-italic.woff2"]) {
  fs.copyFileSync(path.join(ROOT, "public/fonts", f), path.join(OUT, f));
}
console.log("assets:", fs.readdirSync(OUT).length);
