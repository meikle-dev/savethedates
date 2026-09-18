import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { slugSchema, reservedSlugs } from "./publication-validation";
import { preparePhoto } from "./photo";

describe("publication input", () => {
  it("normalises URLs and rejects reserved or invalid paths", () => {
    expect(slugSchema.parse(" Alex-and-Morgan ")).toBe("alex-and-morgan");
    for (const value of [...reservedSlugs, "ab", "a".repeat(64), "-alex", "alex-", "alex--morgan", "alex/morgan", "alex morgan", "áléx"]) expect(slugSchema.safeParse(value).success).toBe(false);
  });
  it("decodes, resizes, and strips photo metadata", async () => {
    const source = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#0f4c5c" } }).withMetadata().jpeg().toBuffer();
    const output = await preparePhoto(new File([new Uint8Array(source)], "photo.jpg", { type: "image/jpeg" }));
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(2000);
    expect(meta.exif).toBeUndefined();
  });
  it("rejects oversized, disguised, corrupt and excessive-pixel images", async () => {
    for (const file of [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" }), new File(["<svg/>"], "fake.jpg", { type: "image/jpeg" }), new File(["bad"], "bad.png", { type: "image/png" }), new File(["x"], "a.svg", { type: "image/svg+xml" })]) await expect(preparePhoto(file)).rejects.toThrow();
    const huge = await sharp({ create: { width: 5100, height: 5000, channels: 3, background: "white" } }).png().toBuffer();
    await expect(preparePhoto(new File([new Uint8Array(huge)], "large.png", { type: "image/png" }))).rejects.toThrow("25 megapixels");
  });
});
