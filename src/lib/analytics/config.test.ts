import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsConfig } from "./config";

const id = "0f8d3c7a-1b2c-4d5e-8f90-a1b2c3d4e5f6";

describe("analytics config", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off unless a valid website ID is set", () => {
    vi.stubEnv("UMAMI_WEBSITE_ID", "");
    expect(analyticsConfig()).toBeNull();
    vi.stubEnv("UMAMI_WEBSITE_ID", "not-an-id");
    expect(analyticsConfig()).toBeNull();
  });

  it("defaults to Umami Cloud and accepts only an https script URL", () => {
    vi.stubEnv("UMAMI_WEBSITE_ID", id);
    expect(analyticsConfig()).toEqual({ websiteId: id, scriptUrl: "https://cloud.umami.is/script.js" });
    vi.stubEnv("UMAMI_SCRIPT_URL", "http://example.test/script.js");
    expect(analyticsConfig()).toBeNull();
  });
});
