import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { reservedNames, suggestedNames } from "./guest-link";

const root = path.resolve(import.meta.dirname, "../../..");
const conventionFiles = new Set(["layout", "page", "not-found", "error", "global-error", "loading", "template", "default", "route"]);

// Every first path segment the application serves itself: src/app folders (through route groups) and metadata
// files, plus folders in public/. A names part equal to one would be routed to that page instead of the wedding.
function topLevelSegments(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (/^\(.+\)$/.test(entry.name)) return topLevelSegments(path.join(directory, entry.name));
      if (/^[_[]/.test(entry.name)) return [];
      return [entry.name];
    }
    const name = entry.name.replace(/\..*$/, "");
    return conventionFiles.has(name) || entry.name.endsWith(".css") ? [] : [name];
  });
}

describe("guest link", () => {
  it("reserves every top-level application route and public folder", () => {
    const publicFolders = readdirSync(path.join(root, "public"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const segments = [...topLevelSegments(path.join(root, "src/app")), ...publicFolders];
    expect(segments).toEqual(expect.arrayContaining(["account", "dashboard", "demo", "examples", "robots"]));
    expect(segments.filter((segment) => !reservedNames.has(segment))).toEqual([]);
  });

  it("matches the names reserved by the latest wedding_slug_valid migration", () => {
    const migrations = path.join(root, "supabase/migrations");
    const latest = readdirSync(migrations).sort().reverse().map((file) => readFileSync(path.join(migrations, file), "utf8")).find((sql) => sql.includes("add constraint wedding_slug_valid"))!;
    const list = latest.slice(latest.indexOf("add constraint wedding_slug_valid")).match(/slug not in \(([^)]*)\)/)![1];
    expect(new Set([...list.matchAll(/'([^']+)'/g)].map((match) => match[1]))).toEqual(reservedNames);
  });

  it("keeps the only dynamic top-level route as the guest link", () => {
    const dynamic = readdirSync(path.join(root, "src/app")).filter((name) => name.startsWith("["));
    expect(dynamic).toEqual(["[names]"]);
    expect(readdirSync(path.join(root, "src/app/[names]"))).toEqual(["[secret]"]);
  });

  it("suggests a valid names part from the couple's names", () => {
    expect(suggestedNames("Alex", "Morgan")).toBe("alex-and-morgan");
    expect(suggestedNames(" Zoë ", "Seán O'Neill")).toBe("zoe-and-sean-o-neill");
    expect(suggestedNames("Alexandra-Marguerite", "Christopher-Alexander Montgomery-Smythe")).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(suggestedNames("Alexandra-Marguerite", "Christopher-Alexander Montgomery-Smythe").length).toBeLessThanOrEqual(63);
    expect(suggestedNames("李", "王")).toBe("our-wedding");
    expect(suggestedNames("Demo", "")).toBe("our-wedding");
  });
});
