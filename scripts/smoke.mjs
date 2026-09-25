import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const home = await fetch(base);
assert.equal(home.status, 200);
assert.doesNotMatch(await home.text(), /Open the Save the Date preview|Chloe|Ross/);
const health = await fetch(new URL("/api/health", base));
assert.equal(health.status, 200);
assert.equal(await health.text(), "ok");
for (const path of ["/demo", "/demo-no-photo", "/demo-long-names", "/unknown-wedding", `/unknown-wedding/${"x".repeat(43)}`, "/preview-photo"]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 404, `${path} must be unavailable in production`);
  assert.doesNotMatch(await response.text(), /Chloe|Ross|Alexandra-Marguerite/);
}
console.log(`Production smoke passed: ${base} (home, health check and six protected/unknown routes)`);
