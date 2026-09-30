import { describe, expect, it } from "vitest";
import { fillWording, isIsoDate, monthsBefore, sendingPlan, weeksBefore, wordingGroups } from "./wording";

const empty = { names: "", date: "", place: "", link: "" };

describe("save the date wording", () => {
  it("fills the couple's details and writes the date out", () => {
    expect(fillWording("Save the date! {names} are getting married on {date} in {place}. {link}", { names: " Olivia & James ", date: "2027-06-12", place: "Lake Como", link: "https://savethedates.co.uk/olivia-and-james/abc" }))
      .toBe("Save the date! Olivia & James are getting married on 12 June 2027 in Lake Como. https://savethedates.co.uk/olivia-and-james/abc");
  });

  it("keeps a visible placeholder for anything not typed, including an invalid date", () => {
    expect(fillWording("{names}, {date}, {place}, {link}", { ...empty, date: "2027-02-30" })).toBe("[your names], [wedding date], [town or venue], [your link]");
  });

  it("uses only the four known placeholders in every template", () => {
    for (const template of wordingGroups.flatMap((group) => group.templates)) {
      expect(template.text.match(/\{[^}]*\}/g)?.every((token) => ["{names}", "{date}", "{place}", "{link}"].includes(token)), template.id).toBe(true);
      expect(fillWording(template.text, empty), template.id).not.toMatch(/[{}]/);
    }
  });

  it("gives every template a unique id", () => {
    const ids = wordingGroups.flatMap((group) => group.templates.map((template) => `${group.id}-${template.id}`));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("sending plan", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    for (const value of ["2027-02-29", "2027-13-01", "12/06/2027", ""]) expect(isIsoDate(value), value).toBe(false);
  });

  it("moves back whole months, ending on the month's last day when needed", () => {
    expect(monthsBefore("2027-06-12", 12)).toBe("2026-06-12");
    expect(monthsBefore("2027-08-31", 6)).toBe("2027-02-28");
    expect(monthsBefore("2028-08-31", 6)).toBe("2028-02-29");
    expect(monthsBefore("2027-01-15", 3)).toBe("2026-10-15");
    expect(weeksBefore("2027-06-12", 6)).toBe("2027-05-01");
  });

  it("suggests UK-style windows for a wedding at home", () => {
    expect(sendingPlan("2027-06-12", false, "2026-01-01")).toEqual({
      saveTheDate: { from: "2026-06-12", to: "2026-12-12", started: false, late: false },
      invitation: { from: "2027-03-20", to: "2027-04-17", started: false, late: false },
      replyBy: { date: "2027-05-01", late: false },
    });
  });

  it("gives guests more notice for a destination wedding", () => {
    const plan = sendingPlan("2027-06-12", true, "2026-01-01")!;
    expect(plan.saveTheDate).toEqual({ from: "2026-06-12", to: "2026-09-12", started: false, late: false });
    expect(plan.invitation).toEqual({ from: "2027-02-12", to: "2027-03-12", started: false, late: false });
  });

  it("flags windows that have opened or passed, and a reply date that has passed", () => {
    const soon = sendingPlan("2027-06-12", false, "2027-04-01")!;
    expect(soon.saveTheDate).toMatchObject({ started: true, late: true });
    expect(soon.invitation).toMatchObject({ started: true, late: false });
    expect(soon.replyBy.late).toBe(false);
    const eightMonths = sendingPlan("2027-06-12", false, "2026-10-12")!;
    expect(eightMonths.saveTheDate).toMatchObject({ started: true, late: false });
    expect(sendingPlan("2027-06-12", false, "2027-05-15")!.replyBy.late).toBe(true);
  });

  it("returns nothing for a past, same-day or invalid wedding date", () => {
    expect(sendingPlan("2026-09-29", false, "2026-09-29")).toBeNull();
    expect(sendingPlan("2025-06-12", false, "2026-09-29")).toBeNull();
    expect(sendingPlan("not-a-date", false, "2026-09-29")).toBeNull();
  });
});
