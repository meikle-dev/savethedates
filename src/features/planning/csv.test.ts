import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { parseSheet } from "./guest-import";

describe("toCsv", () => {
  it("writes a BOM and CRLF rows, quoting only when needed", () => {
    expect(toCsv([["Name", "Group"], ["Smith, Ann", 'The "Best" Man'], ["Line\nbreak", "a;b"]])).toBe(
      '﻿Name,Group\r\n"Smith, Ann","The ""Best"" Man"\r\n"Line\nbreak","a;b"\r\n',
    );
    expect(toCsv([])).toBe("﻿");
  });

  it("guards cells a spreadsheet would run as formulas", () => {
    expect(toCsv([["=SUM(A1)", "+1", "-2", "@cmd", "\tx", "\rx", "a=b"]])).toBe(
      "﻿'=SUM(A1),'+1,'-2,'@cmd,\"'\tx\",\"'\rx\",a=b\r\n",
    );
    expect(toCsv([['=HYPERLINK("x")']])).toBe('﻿"\'=HYPERLINK(""x"")"\r\n');
  });

  it("round-trips through parseSheet", () => {
    const rows = [
      ["Name", "Group", "RSVP"],
      ["Zoë Ó Briain", "Bride's family; Dublin", "attending"],
      ["Smith, Ann", 'She said "hi"', ""],
      ["Multi\r\nline", "tab\tinside", "  spaced  "],
    ];
    expect(parseSheet(toCsv(rows))).toEqual(rows);
    expect(parseSheet(toCsv([["a;b;c", "d"]]))).toEqual([["a;b;c", "d"]]);
  });
});
