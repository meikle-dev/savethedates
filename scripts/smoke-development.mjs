import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const demo = await fetch(new URL("/demo", base));
assert.equal(demo.status, 200);
assert.match(await demo.text(), /Chloe/);
const photo = await fetch(new URL("/preview-photo", base));
assert.equal(photo.status, 200);
assert.equal(photo.headers.get("content-type"), "image/jpeg");
assert.ok((await photo.arrayBuffer()).byteLength > 0);
const unknown = await fetch(new URL("/unknown-wedding", base));
assert.equal(unknown.status, 404);
console.log(`Development smoke passed: ${base} (demo, photo, and unknown slug)`);
