import { describe, expect, it } from "vitest";
import { emptyDetails } from "../weddings/details";
import { collectResponses, daysUntil, rsvpAvailability, setupSteps, todayUtc, guestPageStatuses } from "./workspace-summary";

describe("workspace summary", () => {
  it("counts whole UTC days to the wedding", () => {
    expect(todayUtc(new Date("2026-09-23T23:30:00Z"))).toBe("2026-09-23");
    expect(daysUntil("2027-09-03", "2026-09-23")).toBe(345);
    expect(daysUntil("2026-09-23", "2026-09-23")).toBe(0);
    expect(daysUntil("2026-09-20", "2026-09-23")).toBe(-3);
    expect(daysUntil("2027-03-29", "2027-03-27")).toBe(2);
  });

  it("maps ordered shared responses for the overview", () => {
    const responses = collectResponses([
      { id: "s1", responding_name: "Jordan Lee", attending: false, responded_at: "2026-09-21T10:00:00Z" },
      { id: "s2", responding_name: "Sam", attending: true, responded_at: "2026-09-20T10:00:00Z" },
    ]);
    expect(responses.map((response) => response.name)).toEqual(["Jordan Lee", "Sam"]);
  });

  it("reports RSVP availability including the closing date", () => {
    expect(rsvpAvailability(false, null, "2026-09-23", true)).toBe("off");
    expect(rsvpAvailability(true, null, "2026-09-23", true)).toBe("open");
    expect(rsvpAvailability(true, "2026-09-23", "2026-09-23", true)).toBe("open");
    expect(rsvpAvailability(true, "2026-09-22", "2026-09-23", true)).toBe("closed");
    expect(rsvpAvailability(true, null, "2026-09-23", false)).toBe("not-live");
    expect(rsvpAvailability(false, null, "2026-09-23", false)).toBe("off");
    // A closing date that has passed is reported before publication too, and an offline site overrides everything.
    expect(rsvpAvailability(true, "2026-09-22", "2026-09-23", false)).toBe("closed");
    expect(rsvpAvailability(true, null, "2026-09-23", false, true)).toBe("offline");
    expect(rsvpAvailability(false, null, "2026-09-23", false, true)).toBe("offline");
  });

  it("closes RSVPs at the same UTC boundary as the database (current_date <= closing date)", () => {
    const at = (instant: string) => rsvpAvailability(true, "2027-05-01", todayUtc(new Date(instant)), true);
    expect(at("2027-05-01T23:59:59.999Z")).toBe("open");
    expect(at("2027-05-02T00:00:00.000Z")).toBe("closed");
    // 00:30 on 2 May in UK summer time is still 1 May UTC, so replies are still accepted.
    expect(at("2027-05-01T23:30:00Z")).toBe("open");
    expect(at("2027-05-02T00:30:00+01:00")).toBe("open");
    expect(at("2027-05-02T01:00:00+01:00")).toBe("closed");
    const winter = (instant: string) => rsvpAvailability(true, "2026-12-01", todayUtc(new Date(instant)), true);
    expect(winter("2026-12-01T23:59:59Z")).toBe("open");
    expect(winter("2026-12-02T00:00:00Z")).toBe("closed");
  });

  it("derives setup progress from saved data only", () => {
    const initial = setupSteps({ ...emptyDetails, photo_path: null, rsvp_enabled: false, invitation_enabled: false }, false, false);
    expect(initial.filter((step) => step.done).map((step) => step.id)).toEqual(["basics"]);
    const hiddenDetails = setupSteps({ ...emptyDetails, ceremony_venue: "Church", photo_path: null, rsvp_enabled: false, invitation_enabled: false }, false, false);
    expect(hiddenDetails.find((step) => step.id === "details")?.done).toBe(false);
    const complete = setupSteps({ ...emptyDetails, details_enabled: true, reception_venue: "Hall", photo_path: "p.webp", rsvp_enabled: true, invitation_enabled: true }, true, true);
    expect(complete.every((step) => step.done)).toBe(true);
  });

  it("treats the Invitation and Details pages as optional", () => {
    const steps = setupSteps({ ...emptyDetails, photo_path: null, rsvp_enabled: true, invitation_enabled: false }, true, true);
    expect(steps.filter((step) => step.optional).map((step) => step.id)).toEqual(["photo", "invitation", "details"]);
    expect(steps.every((step) => step.done || step.optional)).toBe(true);
  });

  it("lists every guest page in guest order with its state", () => {
    const summary = (invitation: boolean, details: boolean, rsvp: Parameters<typeof guestPageStatuses>[1], live: boolean) =>
      guestPageStatuses({ invitation_enabled: invitation, details_enabled: details }, rsvp, live).map(({ id, status, on }) => [id, status, on]);
    expect(summary(false, false, "off", false)).toEqual([["home", "Always on", true], ["invitation", "Off", false], ["details", "Off", false], ["rsvp", "Off", false]]);
    expect(summary(true, true, "not-live", false)).toEqual([["home", "Always on", true], ["invitation", "On when published", true], ["details", "On when published", true], ["rsvp", "Opens when published", true]]);
    expect(summary(true, false, "closed", true)).toEqual([["home", "Always on", true], ["invitation", "On", true], ["details", "Off", false], ["rsvp", "Closed", false]]);
  });
});
