import { describe, expect, it } from "vitest";
import { formatInvitationDate, invitationFormValues, invitationPlace, invitationSchema } from "./invitation";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("invitation", () => {
  it("reads the form, trimming text and treating an unticked switch as off", () => {
    const values = invitationFormValues(form({ invitation_host_line: "  Together with their families ", ceremony_venue: "St Mary’s" }));
    expect(values.invitation_enabled).toBe(false);
    expect(invitationSchema.parse(values)).toMatchObject({ invitation_host_line: "Together with their families", ceremony_venue: "St Mary’s", invitation_wording: "" });
    expect(invitationFormValues(form({ invitation_enabled: "on" })).invitation_enabled).toBe(true);
  });

  it("limits each line to its stored length", () => {
    const tooLong = invitationSchema.safeParse(invitationFormValues(form({ invitation_host_line: "x".repeat(161), invitation_wording: "y".repeat(301) })));
    expect(tooLong.success).toBe(false);
    expect(Object.keys(tooLong.error!.flatten().fieldErrors).sort()).toEqual(["invitation_host_line", "invitation_wording"]);
    expect(invitationSchema.safeParse(invitationFormValues(form({ invitation_wording: "y".repeat(300) }))).success).toBe(true);
  });

  it("uses the Basics location when no ceremony address is saved", () => {
    expect(invitationPlace({ ceremony_address: "The Old Barn, Bath BA1 1AA", location: "Bath" })).toBe("The Old Barn, Bath BA1 1AA");
    expect(invitationPlace({ ceremony_address: "  ", location: "Bath, England" })).toBe("Bath, England");
  });

  it("names the weekday, as invitations do", () => {
    expect(formatInvitationDate("2027-06-14")).toBe("Monday 14 June 2027");
    expect(formatInvitationDate("2027-12-31")).toBe("Friday 31 December 2027");
  });
});
