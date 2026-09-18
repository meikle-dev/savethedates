import { describe, expect, it } from "vitest";
import { closeDateSchema, hashInvitationToken, invitationTokenSchema, inviteNameSchema, rsvpNameSchema } from "./rsvp";

describe("RSVP validation", () => {
  it("normalises bounded names", () => {
    expect(inviteNameSchema.parse("  The Morgan family ")).toBe("The Morgan family");
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

  it("creates a stable non-reversible token digest", () => {
    expect(hashInvitationToken("a".repeat(43))).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInvitationToken("a".repeat(43))).not.toContain("a".repeat(43));
  });
});
