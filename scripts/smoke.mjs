import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const home = await fetch(base);
assert.equal(home.status, 200);
assert.doesNotMatch(await home.text(), /Open the Save the Date preview|Chloe|Ross/);
for (const path of ["/demo", "/demo-no-photo", "/demo-long-names", "/unknown-wedding", "/preview-photo"]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 404, `${path} must be unavailable in production`);
  assert.doesNotMatch(await response.text(), /Chloe|Ross|Alexandra-Marguerite/);
}
console.log(`Production smoke passed: ${base} (home and five protected/unknown routes)`);
