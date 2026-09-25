// Runs in the Docker build stage after `next build`. Copies the built JavaScript and its source maps (which carry
// debug IDs) to ./sourcemaps for CI to upload to Sentry, then removes every map and sourceMappingURL comment from
// the build, so the production image never ships or serves source maps.
import { cp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const output = "sourcemaps";
const mapComment = /\n?(\/\/# sourceMappingURL=[^\n]*|\/\*# sourceMappingURL=[^\n]*\*\/)\s*$/;

async function files(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

await rm(output, { recursive: true, force: true });
for (const [source, target] of [[".next/static", "static"], [".next/server", "server"]]) {
  await cp(source, join(output, target), { recursive: true, filter: async (path) => /\.(js|map)$/.test(path) || (await stat(path)).isDirectory() });
}

let maps = 0;
for (const directory of [".next/static", ".next/server", ".next/standalone/.next/server"]) {
  for (const file of await files(directory)) {
    if (file.endsWith(".map")) {
      await rm(file);
      maps += 1;
    } else if (/\.(js|css)$/.test(file)) {
      const code = await readFile(file, "utf8");
      if (mapComment.test(code)) await writeFile(file, code.replace(mapComment, "\n"));
    }
  }
}
if (!maps) throw new Error("No source maps found; check productionBrowserSourceMaps and turbopack.debugIds in next.config.ts.");
console.log(`Moved source maps to ./${output} and removed ${maps} map files from the build.`);
