import { describe, expect, it } from "vitest";
import { emptyDetails } from "../weddings/details";
import { collectResponses, daysUntil, rsvpAvailability, setupSteps, todayUtc } from "./workspace-summary";

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
  });

  it("derives setup progress from saved data only", () => {
    const initial = setupSteps({ ...emptyDetails, photo_path: null, rsvp_enabled: false }, false, false);
    expect(initial.filter((step) => step.done).map((step) => step.id)).toEqual(["basics"]);
    const hiddenDetails = setupSteps({ ...emptyDetails, ceremony_venue: "Church", photo_path: null, rsvp_enabled: false }, false, false);
    expect(hiddenDetails.find((step) => step.id === "details")?.done).toBe(false);
    const complete = setupSteps({ ...emptyDetails, details_enabled: true, reception_venue: "Hall", photo_path: "p.webp", rsvp_enabled: true }, true, true);
    expect(complete.every((step) => step.done)).toBe(true);
  });
});
