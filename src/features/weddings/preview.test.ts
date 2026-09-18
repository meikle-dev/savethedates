import { afterEach, describe, expect, it, vi } from "vitest";
import { formatWeddingDate } from "./wedding";

vi.mock("server-only", () => ({}));
const { getDevelopmentWedding } = await import("./preview");

afterEach(() => vi.unstubAllEnvs());

describe("development wedding boundary", () => {
  it.each(["production", "test"])("never serves fixtures in %s", (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    for (const slug of ["demo", "demo-no-photo", "demo-long-names", "unknown"]) {
      expect(getDevelopmentWedding(slug)).toBeNull();
    }
  });
  it("serves only explicit fixture slugs in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getDevelopmentWedding("demo")?.names).toEqual(["Chloe", "Ross"]);
    expect(getDevelopmentWedding("demo-no-photo")?.image).toBeUndefined();
    expect(getDevelopmentWedding("demo-no-photo")?.message).toBeUndefined();
    expect(getDevelopmentWedding("unknown")).toBeNull();
  });
  it("formats the calendar date independently of the server timezone", () => {
    expect(formatWeddingDate("2027-06-14")).toBe("14 June 2027");
  });
});
