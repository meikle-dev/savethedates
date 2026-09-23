import { describe, expect, it } from "vitest";
import { sharedSecretFromSearchParam, weddingJourneyHrefs } from "./invitation-context";
import { closeDateSchema, invitationTokenSchema, rsvpNameSchema } from "./rsvp";

describe("RSVP validation", () => {
  it("normalises bounded names", () => {
    expect(rsvpNameSchema.parse("  The Morgan family ")).toBe("The Morgan family");
    expect(rsvpNameSchema.safeParse(" ").success).toBe(false);
    expect(rsvpNameSchema.safeParse("x".repeat(81)).success).toBe(false);
  });

  it("accepts only exact invitation tokens and valid optional dates", () => {
    const token = "a".repeat(43);
    expect(invitationTokenSchema.parse(token)).toBe(token);
    expect(invitationTokenSchema.safeParse(`${token}a`).success).toBe(false);
    expect(closeDateSchema.parse("")).toBeNull();
    expect(closeDateSchema.parse("2027-09-18")).toBe("2027-09-18");
    expect(closeDateSchema.safeParse("2027-02-30").success).toBe(false);
  });

  it("propagates only one syntactically valid shared context", () => {
    const token = "A".repeat(43);
    expect(sharedSecretFromSearchParam(token)).toBe(token);
    expect(sharedSecretFromSearchParam([token, token])).toBeNull();
    expect(sharedSecretFromSearchParam("not-a-token")).toBeNull();
    expect(weddingJourneyHrefs("alex-and-morgan", token)).toEqual({
      home: `/alex-and-morgan?share=${token}`,
      details: `/alex-and-morgan/details?share=${token}`,
      rsvp: `/s/${token}/alex-and-morgan/rsvp`,
    });
    expect(weddingJourneyHrefs("alex-and-morgan").rsvp).toBe("/alex-and-morgan/rsvp");
  });
});
