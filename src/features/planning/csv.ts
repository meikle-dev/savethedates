// CSV downloads that open cleanly in Excel. Pure, so it is shared by server routes and unit tested.

// Excel runs cells starting with these as formulas, so guest-entered text could otherwise execute on open.
const formulaStart = /^[=+\-@\t\r]/;
// Semicolons and tabs are quoted too, so a reader that detects the delimiter (parseSheet) is never misled.
const needsQuotes = /[",;\t\r\n]/;

function csvCell(value: string) {
  const safe = formulaStart.test(value) ? `'${value}` : value;
  return needsQuotes.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** UTF-8 BOM (so Excel reads accents correctly) and CRLF-terminated rows. */
export function toCsv(rows: string[][]): string {
  return `﻿${rows.map((row) => `${row.map(csvCell).join(",")}\r\n`).join("")}`;
}
