// Builds the launch film end to end and writes the finished files to the marketing-videos folder.
//   node build.mjs            full build (about 6 minutes)
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../..");
const name = "savethedates-launch-film-1080p";
const run = (cmd, args) => execFileSync(cmd, args, { cwd: here, stdio: "inherit" });

run("node", ["prep.mjs", "assets"]);
run("node", ["render.mjs", "cues", "cues.json"]);
run("node", ["score.mjs", "cues.json", "score.wav"]);
run("node", ["render.mjs", "video", "film-silent.mp4", "60"]);
// web-size encode (about 24 MB) from the high-quality render
run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", "film-silent.mp4", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", "web.mp4"]);
run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", "web.mp4", "-c", "copy", "-movflags", "+faststart", path.join(OUT, `${name}-no-music.mp4`)]);
run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", "web.mp4", "-i", "score.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", path.join(OUT, `${name}.mp4`)]);
run(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-ss", "8", "-i", "film-silent.mp4", "-frames:v", "1", "-q:v", "2", path.join(OUT, `${name}-poster.jpg`)]);
console.log("Written to", OUT);
