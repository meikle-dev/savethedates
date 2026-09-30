import { describe, expect, it } from "vitest";
import {
  buildImport, cleanText, detectColumns, guestListTemplate, maxGuestNameLength, maxGroupLength, normaliseName,
  parseSheet, parseStatus, type ColumnRole,
} from "./guest-import";

describe("cleanText and normaliseName", () => {
  it("collapses whitespace, drops control characters and NFC-normalises", () => {
    expect(cleanText("  Sam\t  Taylor\r\n ")).toBe("Sam Taylor");
    expect(cleanText("A\u0000li\u0085ce \u0007 B\u009f")).toBe("Ali ce B");
    expect(cleanText("Zoë")).toBe("Zoë");
    expect(cleanText("  　 ")).toBe("");
  });

  it("lower-cases but keeps diacritics", () => {
    expect(normaliseName("  ZOË   Ó Briain ")).toBe("zoë ó briain");
    expect(normaliseName("Zoë")).not.toBe(normaliseName("Zoe"));
  });
});

describe("parseSheet", () => {
  it("strips a BOM and accepts CRLF, LF and CR line endings", () => {
    const expected = [["Name", "Group"], ["Ann", "Family"], ["Bob", "Friends"]];
    expect(parseSheet("﻿Name,Group\r\nAnn,Family\r\nBob,Friends\r\n")).toEqual(expected);
    expect(parseSheet("Name,Group\nAnn,Family\nBob,Friends")).toEqual(expected);
    expect(parseSheet("Name,Group\rAnn,Family\rBob,Friends\r")).toEqual(expected);
  });

  it("handles quoted delimiters, newlines and escaped quotes", () => {
    expect(parseSheet('"Smith, Ann","Line one\r\nline two","She said ""hi"""\nBob,5" tall,x')).toEqual([
      ["Smith, Ann", "Line one\r\nline two", 'She said "hi"'],
      ["Bob", '5" tall', "x"],
    ]);
    expect(parseSheet('Name, "Smith, Ann"')).toEqual([["Name", "Smith, Ann"]]);
    expect(parseSheet('"unterminated, cell')).toEqual([["unterminated, cell"]]);
  });

  it("reads cells pasted from Excel, keeping untrimmed cells and trailing tabs", () => {
    expect(parseSheet("Name\tGroup\t\r\n Ann \tFamily, bride\t\t\r\nBob\t\t\r\n\t\t\r\n")).toEqual([
      ["Name", "Group", ""],
      [" Ann ", "Family, bride", "", ""],
      ["Bob", "", ""],
    ]);
  });

  it("detects semicolons from European Excel, ignoring blank and quoted text", () => {
    expect(parseSheet(";;\r\nName;Group\r\nSmith, Ann;Family\r\n")).toEqual([["Name", "Group"], ["Smith, Ann", "Family"]]);
    expect(parseSheet('"a;b;c",d\r\n')).toEqual([["a;b;c", "d"]]);
    expect(parseSheet("Ann; Bob, Cat\r\n")).toEqual([["Ann; Bob", " Cat"]]);
  });

  it("drops blank rows and reads a plain list of names", () => {
    expect(parseSheet("\n\nAnn Smith\n  \n,,\nBob Jones\n\n")).toEqual([["Ann Smith"], ["Bob Jones"]]);
    expect(parseSheet("")).toEqual([]);
  });
});

describe("detectColumns", () => {
  it("recognises header synonyms regardless of case and punctuation", () => {
    expect(detectColumns([["Forename", "Surname:", "Household", "RSVP?", "Notes"], ["Ann", "Smith", "", "", ""]])).toEqual({
      header: true,
      roles: ["first", "last", "group", "status", "ignore"],
    });
    expect(detectColumns([["Name (required)", "Table group*", "First_name"]]).roles).toEqual(["name", "group", "first"]);
  });

  it("keeps the first column for each role and widens to the longest row", () => {
    expect(detectColumns([["Guest", "Full name", "Side", "Family"], ["Ann", "", "", "", "extra"]])).toEqual({
      header: true,
      roles: ["name", "ignore", "group", "ignore", "ignore"],
    });
  });

  it("treats a sheet without a recognised header as a list of names", () => {
    expect(detectColumns([["Ann Smith", "Bride"], ["Bob", "Groom", "x"]])).toEqual({ header: false, roles: ["name", "ignore", "ignore"] });
    expect(detectColumns([])).toEqual({ header: false, roles: [] });
  });
});

describe("parseStatus", () => {
  it("maps common spreadsheet answers", () => {
    for (const value of ["Yes", " y ", "ATTENDING", "Accepted", "coming", "Confirmed", "true", "1"]) expect(parseStatus(value)).toBe("attending");
    for (const value of ["No", "n", "Declined", "not  attending", "Not coming", "Can’t come", "cannot come", "Regrets", "FALSE", "0"]) {
      expect(parseStatus(value)).toBe("declined");
    }
    for (const value of ["", "maybe", "pending", "invited", "awaiting", "yes please"]) expect(parseStatus(value)).toBe("awaiting");
  });
});

describe("buildImport", () => {
  it("imports a headed sheet with names, groups and replies", () => {
    const rows = parseSheet("Name,Group,RSVP\r\nZoë Ó Briain,Bride's family,yes\r\n Sam  Taylor ,,no\r\nAlex,Friends,\r\n");
    const { header, roles } = detectColumns(rows);
    expect(buildImport(rows, header, roles, [])).toEqual({
      rows: [
        { line: 2, name: "Zoë Ó Briain", group: "Bride's family", status: "attending", result: "ok" },
        { line: 3, name: "Sam Taylor", group: "", status: "declined", result: "ok" },
        { line: 4, name: "Alex", group: "Friends", status: "awaiting", result: "ok" },
      ],
      guests: [
        { name: "Zoë Ó Briain", group: "Bride's family", status: "attending" },
        { name: "Sam Taylor", group: "", status: "declined" },
        { name: "Alex", group: "Friends", status: "awaiting" },
      ],
    });
  });

  it("joins first and last names, or uses whichever exists", () => {
    const rows = [["First name", "Last name"], ["Ann", "Smith"], ["", "Jones"], ["Cat", ""]];
    expect(buildImport(rows, true, ["first", "last"], []).guests.map((guest) => guest.name)).toEqual(["Ann Smith", "Jones", "Cat"]);
    expect(buildImport(rows, true, ["first", "ignore"], []).guests.map((guest) => guest.name)).toEqual(["Ann", "Cat"]);
  });

  it("numbers lines from 1 without a header and defaults group and status", () => {
    const rows = parseSheet("Ann\nBob\n");
    const { header, roles } = detectColumns(rows);
    expect(buildImport(rows, header, roles, []).rows.map(({ line, group, status }) => ({ line, group, status }))).toEqual([
      { line: 1, group: "", status: "awaiting" },
      { line: 2, group: "", status: "awaiting" },
    ]);
  });

  it("reports every problem, first applicable reason wins", () => {
    const long = "x".repeat(maxGuestNameLength + 1);
    const rows = [
      ["  ", "Family"],
      [long, "x".repeat(maxGroupLength + 1)],
      ["Ann", "g".repeat(maxGroupLength + 1)],
      ["ZOË Ó BRIAIN", ""],
      ["Bob", ""],
      [" bob ", ""],
      ["Cat", "g".repeat(maxGroupLength)],
    ];
    expect(buildImport(rows, false, ["name", "group"], ["Zoë Ó Briain"]).rows.map((row) => row.result)).toEqual([
      "empty", "name_too_long", "group_too_long", "duplicate_existing", "ok", "duplicate_file", "ok",
    ]);
  });

  it("counts length in characters, not UTF-16 units", () => {
    const emoji = "😀".repeat(maxGuestNameLength);
    expect(buildImport([[emoji]], false, ["name"], []).rows[0].result).toBe("ok");
  });

  it("stops at the guest limit, counting existing guests", () => {
    const existing = Array.from({ length: 998 }, (_, index) => `Guest ${index}`);
    const result = buildImport([["Ann"], ["Bob"], ["Cat"]], false, ["name"], existing);
    expect(result.rows.map((row) => row.result)).toEqual(["ok", "ok", "over_limit"]);
    expect(result.guests).toHaveLength(2);
  });

  it("marks every row empty when no name column is chosen", () => {
    const roles: ColumnRole[] = ["group", "status"];
    expect(buildImport([["Ann", "yes"], ["Bob", "no"]], false, roles, []).rows.map((row) => row.result)).toEqual(["empty", "empty"]);
  });
});

describe("guestListTemplate", () => {
  it("is a header-only CSV with a BOM that detects as a header", () => {
    expect(guestListTemplate()).toBe("﻿Name,Group,RSVP\r\n");
    const rows = parseSheet(guestListTemplate());
    expect(detectColumns(rows)).toEqual({ header: true, roles: ["name", "group", "status"] });
  });
});
