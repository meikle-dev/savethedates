import { describe, expect, it } from "vitest";
import { guestHrefs } from "./guest-link";
import { closeDateSchema, guestSecretSchema, rsvpNameSchema } from "./rsvp";
import { rsvpDeadline } from "./wedding";

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

  it("states the closing date as the database enforces it: through 23:59 UTC, with UK and Irish time", () => {
    // Winter (GMT): the UTC cutoff is the same clock time in the UK and Ireland.
    expect(rsvpDeadline("2026-12-01")).toEqual({ date: "1 December 2026", exact: "23:59 UTC on 1 December 2026 (23:59 in the UK and Ireland)" });
    // Summer (BST/IST): the cutoff is 00:59 the next morning locally, never the local end of the day.
    expect(rsvpDeadline("2027-05-01")).toEqual({ date: "1 May 2027", exact: "23:59 UTC on 1 May 2027 (00:59 on 2 May in the UK and Ireland)" });
    // Clock-change days: 28 March 2027 is already BST at 23:59 UTC; 31 October 2027 is GMT again, 30 October still BST.
    expect(rsvpDeadline("2027-03-28").exact).toBe("23:59 UTC on 28 March 2027 (00:59 on 29 March in the UK and Ireland)");
    expect(rsvpDeadline("2027-03-27").exact).toBe("23:59 UTC on 27 March 2027 (23:59 in the UK and Ireland)");
    expect(rsvpDeadline("2027-10-30").exact).toBe("23:59 UTC on 30 October 2027 (00:59 on 31 October in the UK and Ireland)");
    expect(rsvpDeadline("2027-10-31").exact).toBe("23:59 UTC on 31 October 2027 (23:59 in the UK and Ireland)");
    // Year end in summer time never applies; a 31 December date stays on the same day.
    expect(rsvpDeadline("2027-12-31").exact).toBe("23:59 UTC on 31 December 2027 (23:59 in the UK and Ireland)");
  });

  it("puts every guest page under the names part and secret", () => {
    const token = "A".repeat(43);
    expect(guestHrefs("alex-and-morgan", token)).toEqual({
      home: `/alex-and-morgan/${token}`,
      invitation: `/alex-and-morgan/${token}/invitation`,
      details: `/alex-and-morgan/${token}/details`,
      rsvp: `/alex-and-morgan/${token}/rsvp`,
    });
  });
});
