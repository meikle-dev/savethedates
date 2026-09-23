import { describe, expect, it } from "vitest";
import { filteredCount, guestHref, guestPagination, namePattern, parseGuestQuery } from "./guest-list";

describe("guest list", () => {
  it("parses URL state and falls back safely", () => {
    expect(parseGuestQuery({})).toEqual({ filter: "all", q: "", page: 1 });
    expect(parseGuestQuery({ filter: "attending", q: "  Sam   Taylor ", page: "3" })).toEqual({ filter: "attending", q: "Sam Taylor", page: 3 });
    for (const page of ["0", "-1", "abc", "1.5", "01", "9999999", ""]) expect(parseGuestQuery({ page }).page).toBe(1);
    expect(parseGuestQuery({ filter: "maybe" }).filter).toBe("all");
    expect(parseGuestQuery({ filter: ["not-attending", "all"], page: ["2", "5"] })).toMatchObject({ filter: "not-attending", page: 2 });
    expect(parseGuestQuery({ q: "x".repeat(200) }).q).toHaveLength(80);
    expect(parseGuestQuery({ q: "*a*" }).q).toBe("a");
    expect(parseGuestQuery({ q: " * " }).q).toBe("");
  });

  it("escapes LIKE wildcards in name searches", () => {
    expect(namePattern("Sam")).toBe("%Sam%");
    expect(namePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });

  it("builds canonical links", () => {
    expect(guestHref({ filter: "all", q: "", page: 1 })).toBe("/dashboard/guests");
    expect(guestHref({ filter: "not-attending", q: "Lee & Co", page: 2 })).toBe("/dashboard/guests?filter=not-attending&q=Lee+%26+Co&page=2");
  });

  it("counts the selected filter", () => {
    expect(filteredCount("all", { total: 312, attending: 200 })).toBe(312);
    expect(filteredCount("attending", { total: 312, attending: 200 })).toBe(200);
    expect(filteredCount("not-attending", { total: 312, attending: 200 })).toBe(112);
  });

  it("pages 25 rows at a time", () => {
    expect(guestPagination(0, 1)).toEqual({ pages: 1, from: 0, to: -1, outOfRange: false });
    expect(guestPagination(0, 4).outOfRange).toBe(false);
    expect(guestPagination(1, 1)).toEqual({ pages: 1, from: 0, to: 0, outOfRange: false });
    expect(guestPagination(25, 1)).toEqual({ pages: 1, from: 0, to: 24, outOfRange: false });
    expect(guestPagination(25, 2).outOfRange).toBe(true);
    expect(guestPagination(26, 2)).toEqual({ pages: 2, from: 25, to: 25, outOfRange: false });
    expect(guestPagination(312, 2)).toEqual({ pages: 13, from: 25, to: 49, outOfRange: false });
    expect(guestPagination(312, 13)).toEqual({ pages: 13, from: 300, to: 311, outOfRange: false });
    expect(guestPagination(312, 14).outOfRange).toBe(true);
  });
});
