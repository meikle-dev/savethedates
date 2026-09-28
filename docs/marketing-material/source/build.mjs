// Builds the launch film or the vertical ad end to end and writes the finished files to marketing-videos.
//   node build.mjs          launch film, 16:9 (about 6 minutes)
//   node build.mjs ad       10-second 9:16 ad (about 1 minute)
//   node build.mjs ad45     the same ad at 4:5 for feeds
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../marketing-videos");
const PIECES = {
  film: { page: "index.html", size: "1920x1080", name: "savethedates-launch-film-1080p", poster: 8 },
  ad: { page: "ad.html", size: "1080x1920", name: "savethedates-ad-9x16-10s", poster: 9.5 },
  ad45: { page: "ad.html", size: "1080x1350", name: "savethedates-ad-4x5-10s", poster: 9.5 },
};
const piece = PIECES[process.argv[2] || "film"];
const env = { ...process.env, FILM_PAGE: piece.page, FILM_SIZE: piece.size };
const run = (cmd, args) => execFileSync(cmd, args, { cwd: here, stdio: "inherit", env });
const ff = (...args) => run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args]);
const tmp = (f) => `${piece.name}.${f}`;

run("node", ["prep.mjs", "assets"]);
run("node", ["render.mjs", "cues", tmp("cues.json")]);
run("node", ["score.mjs", tmp("cues.json"), tmp("score.wav")]);
run("node", ["render.mjs", "video", tmp("master.mp4"), "60"]);
// web-size encode from the high-quality render
ff("-i", tmp("master.mp4"), "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", tmp("web.mp4"));
ff("-i", tmp("web.mp4"), "-c", "copy", "-movflags", "+faststart", path.join(OUT, `${piece.name}-no-music.mp4`));
ff("-i", tmp("web.mp4"), "-i", tmp("score.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", path.join(OUT, `${piece.name}.mp4`));
ff("-ss", String(piece.poster), "-i", tmp("master.mp4"), "-frames:v", "1", "-q:v", "2", path.join(OUT, `${piece.name}-poster.jpg`));
console.log("Written to", OUT);
