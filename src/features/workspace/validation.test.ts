import { describe, expect, it } from "vitest";
import { draftSchema } from "./validation";

const valid = { first_name: " Morgan ", second_name: "Taylor", wedding_date: "2028-02-29", location: "Bath", message: "" };
describe("draft validation", () => {
  it("trims text and accepts a leap date and empty message", () => {
    expect(draftSchema.parse(valid)).toEqual({ ...valid, first_name: "Morgan" });
  });
  it.each(["2027-02-29", "2027-02-30", "2027-13-01", "1899-01-01", "", "tomorrow"])("rejects invalid date %s", (wedding_date) => {
    expect(draftSchema.safeParse({ ...valid, wedding_date }).success).toBe(false);
  });
  it("explains a missing date separately and permits a past date with a warning in the form", () => {
    expect(draftSchema.safeParse({ ...valid, wedding_date: "" }).error?.flatten().fieldErrors.wedding_date).toContain("Choose your wedding date.");
    expect(draftSchema.safeParse({ ...valid, wedding_date: "2027-02-29" }).error?.flatten().fieldErrors.wedding_date).toContain("Choose a valid date between 1900 and 2199.");
    expect(draftSchema.safeParse({ ...valid, wedding_date: "2020-01-01" }).success).toBe(true);
  });
  it("rejects missing names and overlong content", () => {
    for (const invalid of [{ first_name: " " }, { second_name: "x".repeat(81) }, { location: "" }, { message: "x".repeat(501) }]) {
      expect(draftSchema.safeParse({ ...valid, ...invalid }).success).toBe(false);
    }
  });
});
