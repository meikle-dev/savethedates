import { describe, expect, it } from "vitest";
import { defaultPhotoFrame, parsePhotoFraming, photoFrameSchema, photoFramingSchema, resolvePhotoFrame, setPhotoFrame } from "./photo-framing";

describe("photo framing", () => {
  it("uses safe page defaults and preserves independent theme/page values", () => {
    expect(resolvePhotoFrame({}, "minimal", "saveTheDate")).toEqual({ x: 50, y: 50, zoom: 1 });
    expect(resolvePhotoFrame({}, "bold", "details")).toEqual({ x: 50, y: 60, zoom: 1 });
    const framing = setPhotoFrame({}, "romantic", "details", { x: 12, y: 88, zoom: 1.45 });
    expect(resolvePhotoFrame(framing, "romantic", "details")).toEqual({ x: 12, y: 88, zoom: 1.45 });
    expect(resolvePhotoFrame(framing, "minimal", "details")).toEqual(defaultPhotoFrame("details"));
  });

  it("rejects arbitrary transforms, extra keys and out-of-range numbers", () => {
    for (const value of [
      { x: -1, y: 50, zoom: 1 },
      { x: 50, y: 101, zoom: 1 },
      { x: 50, y: 50, zoom: 2.01 },
      { x: 50, y: 50, zoom: 1, rotate: 20 },
    ]) expect(photoFrameSchema.safeParse(value).success).toBe(false);
    expect(photoFramingSchema.safeParse({ minimal: { landing: { x: 1, y: 2, zoom: 1 } } }).success).toBe(false);
    expect(parsePhotoFraming({ malicious: "transform" })).toEqual({});
  });
});
