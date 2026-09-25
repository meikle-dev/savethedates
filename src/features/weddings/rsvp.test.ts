import { describe, expect, it } from "vitest";
import { guestHrefs } from "./guest-link";
import { closeDateSchema, guestSecretSchema, rsvpNameSchema } from "./rsvp";

describe("RSVP validation", () => {
  it("normalises bounded names", () => {
    expect(rsvpNameSchema.parse("  The Morgan family ")).toBe("The Morgan family");
    expect(rsvpNameSchema.safeParse(" ").success).toBe(false);
    expect(rsvpNameSchema.safeParse("x".repeat(81)).success).toBe(false);
  });

  it("accepts only exact guest link secrets and valid optional dates", () => {
    const token = "a".repeat(43);
    expect(guestSecretSchema.parse(token)).toBe(token);
    expect(guestSecretSchema.safeParse(`${token}a`).success).toBe(false);
    expect(closeDateSchema.parse("")).toBeNull();
    expect(closeDateSchema.parse("2027-09-18")).toBe("2027-09-18");
    expect(closeDateSchema.safeParse("2027-02-30").success).toBe(false);
  });

  it("puts every guest page under the names part and secret", () => {
    const token = "A".repeat(43);
    expect(guestHrefs("alex-and-morgan", token)).toEqual({
      home: `/alex-and-morgan/${token}`,
      details: `/alex-and-morgan/${token}/details`,
      rsvp: `/alex-and-morgan/${token}/rsvp`,
    });
  });
});
