import { describe, expect, it } from "vitest";
import { jpegName, PhotoPrepareError, prepareUpload, resizedDimensions, uploadsAsChosen } from "./photo-resize";

const mb = 1024 * 1024;

describe("prepareUpload", () => {
  it("refuses photos over 60 MB before reading them", async () => {
    const huge = new File([new Uint8Array(60 * mb + 1)], "huge.jpg", { type: "image/jpeg" });
    await expect(prepareUpload(huge)).rejects.toThrow(new PhotoPrepareError("That photo is over 60 MB. Choose a smaller one."));
  });
});

describe("uploadsAsChosen", () => {
  it("keeps photos the server accepts as they are", () => {
    expect(uploadsAsChosen({ size: 5 * mb, type: "image/jpeg" }, 25_000_000)).toBe(true);
    expect(uploadsAsChosen({ size: 1 * mb, type: "image/webp" }, 6000 * 4000)).toBe(true);
    expect(uploadsAsChosen({ size: 1 * mb, type: "image/png" })).toBe(true);
  });

  it("resizes photos over the byte or pixel limit, or in another format", () => {
    expect(uploadsAsChosen({ size: 5 * mb + 1, type: "image/jpeg" }, 1_000_000)).toBe(false);
    expect(uploadsAsChosen({ size: 2 * mb, type: "image/jpeg" }, 25_000_001)).toBe(false);
    expect(uploadsAsChosen({ size: 2 * mb, type: "image/heic" }, 1_000_000)).toBe(false);
  });
});

describe("resizedDimensions", () => {
  it("scales the long edge to 2500 px and keeps the aspect ratio", () => {
    expect(resizedDimensions(8000, 6000)).toEqual({ width: 2500, height: 1875 });
    expect(resizedDimensions(4000, 6000)).toEqual({ width: 1667, height: 2500 });
  });

  it("never enlarges or collapses a side", () => {
    expect(resizedDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(resizedDimensions(100_000, 10)).toEqual({ width: 2500, height: 1 });
  });

  it("stays well under the iOS Safari canvas limit", () => {
    const { width, height } = resizedDimensions(9000, 9000);
    expect(width * height).toBeLessThan(16_777_216);
  });
});

describe("jpegName", () => {
  it("replaces the extension", () => {
    expect(jpegName("IMG_0001.PNG")).toBe("IMG_0001.jpg");
    expect(jpegName("wedding.photo.webp")).toBe("wedding.photo.jpg");
    expect(jpegName("noextension")).toBe("noextension.jpg");
    expect(jpegName(".png")).toBe("photo.jpg");
  });
});
