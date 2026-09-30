// F078: importing a couple's private guest list from a spreadsheet. Pure and dependency-free: the browser parses and
// previews, and the server imports the same cleaning, matching and limits to re-validate.

export const maxGuests = 1000;
export const maxGuestNameLength = 120;
export const maxGroupLength = 60;
export const maxImportBytes = 1_000_000;
export const guestStatuses = ["awaiting", "attending", "declined"] as const;
export type GuestStatus = (typeof guestStatuses)[number];

/** Trims, drops control characters, collapses any whitespace run (tabs, newlines, NBSP) to one space, NFC-normalises. */
export function cleanText(value: string): string {
  // Whitespace goes first so tabs and newlines (themselves control characters) become spaces rather than vanishing.
  return value.normalize("NFC").replace(/[\s\u0085]+/g, " ").replace(/\p{Cc}/gu, "").replace(/ {2,}/g, " ").trim();
}

/** Duplicate and RSVP matching key. Diacritics are kept: "Zoe" and "Zoë" can be different people. */
export function normaliseName(name: string): string {
  return cleanText(name).toLowerCase();
}

const codePoints = (value: string) => Array.from(value).length;

// A quote opens a quoted cell only at the start of a cell (after optional spaces), as spreadsheets write them;
// elsewhere it is literal, e.g. `5" tall`.
function detectDelimiter(text: string): string {
  let tabs = 0, semicolons = 0, commas = 0;
  let content = false, quoted = false, cellStart = true;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') i++;
        else quoted = false;
      }
    } else if (char === '"' && cellStart) {
      quoted = content = true;
      cellStart = false;
    } else if (char === "\r" || char === "\n") {
      // A line of only delimiters is blank, so it does not decide the delimiter.
      if (content) break;
      tabs = semicolons = commas = 0;
      cellStart = true;
    } else if (char === "\t" || char === ";" || char === ",") {
      if (char === "\t") tabs++;
      else if (char === ";") semicolons++;
      else commas++;
      cellStart = true;
    } else if (char !== " ") {
      content = true;
      cellStart = false;
    }
  }
  return tabs ? "\t" : semicolons > commas ? ";" : ",";
}

/** Rows of untrimmed cells from CSV, semicolon CSV or pasted tab-separated cells. Blank rows are dropped. */
export function parseSheet(text: string): string[][] {
  const source = text.startsWith("﻿") ? text.slice(1) : text;
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "", quoted = false, wasQuoted = false;
  const endCell = () => {
    row.push(cell);
    cell = "";
    wasQuoted = false;
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => cleanText(value))) rows.push(row);
    row = [];
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (char === '"' && !wasQuoted && /^ *$/.test(cell)) {
      quoted = wasQuoted = true;
      cell = "";
    } else if (char === delimiter) endCell();
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      endRow();
    } else cell += char;
  }
  endRow();
  return rows;
}

export type ColumnRole = "name" | "first" | "last" | "group" | "status" | "ignore";

const headerSynonyms: Record<Exclude<ColumnRole, "ignore">, string[]> = {
  name: ["name", "full name", "guest", "guest name", "guests", "names", "guest names"],
  first: ["first name", "firstname", "first", "forename", "given name"],
  last: ["last name", "lastname", "last", "surname", "family name"],
  group: ["group", "household", "party", "family", "side", "category", "relationship", "group name", "table group"],
  status: ["rsvp", "status", "attending", "reply", "response", "rsvp status", "coming"],
};

// "Surname:", "Name (required)", "first_name" and "Guest name*" all reduce to their plain words.
function headerRole(cell: string): ColumnRole {
  const words = cleanText(cell).toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  for (const [role, synonyms] of Object.entries(headerSynonyms)) {
    if (synonyms.includes(words)) return role as ColumnRole;
  }
  return "ignore";
}

/** Guesses a header row and each column's role. The couple can change the roles before importing. */
export function detectColumns(rows: string[][]): { header: boolean; roles: ColumnRole[] } {
  // reduce, not Math.max(...spread): a 1 MB paste can have more rows than the engine allows as arguments.
  const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  if (!rows.length) return { header: false, roles: [] };
  const guessed = rows[0].map(headerRole);
  if (!guessed.some((role) => role !== "ignore")) {
    return { header: false, roles: Array.from({ length: width }, (_, index) => index === 0 ? "name" : "ignore") };
  }
  const used = new Set<ColumnRole>();
  const roles = Array.from({ length: width }, (_, index): ColumnRole => {
    const role = guessed[index] ?? "ignore";
    if (role === "ignore" || used.has(role)) return "ignore";
    used.add(role);
    return role;
  });
  return { header: true, roles };
}

const attendingWords = new Set(["yes", "y", "attending", "accepted", "accept", "coming", "confirmed", "true", "1"]);
const declinedWords = new Set([
  "no", "n", "declined", "decline", "not attending", "not coming", "can't come", "cannot come", "regrets", "false", "0",
]);

/** Spreadsheet RSVP answers; anything unrecognised (maybe, pending, blank) is still awaiting a reply. */
export function parseStatus(value: string): GuestStatus {
  const word = cleanText(value).toLowerCase().replace(/[‘’]/g, "'");
  if (attendingWords.has(word)) return "attending";
  if (declinedWords.has(word)) return "declined";
  return "awaiting";
}

export type ImportRowStatus =
  | "ok" | "empty" | "name_too_long" | "group_too_long" | "duplicate_existing" | "duplicate_file" | "over_limit";
export type ImportRow = { line: number; name: string; group: string; status: GuestStatus; result: ImportRowStatus };
export type ImportGuest = { name: string; group: string; status: GuestStatus };

/** The preview: every data row with its outcome, and the rows that will be imported. */
export function buildImport(
  rows: string[][],
  header: boolean,
  roles: ColumnRole[],
  existingNames: string[],
): { rows: ImportRow[]; guests: ImportGuest[] } {
  const column = (role: ColumnRole) => roles.indexOf(role);
  const [nameAt, firstAt, lastAt, groupAt, statusAt] = (["name", "first", "last", "group", "status"] as const).map(column);
  const cellAt = (row: string[], index: number) => index < 0 ? "" : row[index] ?? "";
  const existing = new Set(existingNames.map(normaliseName));
  const seen = new Set<string>();
  const result: ImportRow[] = [];
  const guests: ImportGuest[] = [];
  const offset = header ? 1 : 0;

  rows.slice(offset).forEach((row, index) => {
    const name = cleanText(nameAt >= 0 ? cellAt(row, nameAt) : `${cellAt(row, firstAt)} ${cellAt(row, lastAt)}`);
    const group = cleanText(cellAt(row, groupAt));
    const status = statusAt >= 0 ? parseStatus(cellAt(row, statusAt)) : "awaiting";
    const key = normaliseName(name);
    const outcome: ImportRowStatus =
      !name ? "empty"
      : codePoints(name) > maxGuestNameLength ? "name_too_long"
      : codePoints(group) > maxGroupLength ? "group_too_long"
      : existing.has(key) ? "duplicate_existing"
      : seen.has(key) ? "duplicate_file"
      : existingNames.length + guests.length >= maxGuests ? "over_limit"
      : "ok";
    result.push({ line: index + offset + 1, name, group, status, result: outcome });
    if (outcome !== "ok") return;
    seen.add(key);
    guests.push({ name, group, status });
  });
  return { rows: result, guests };
}

/** Header-only CSV; the BOM makes Excel read names with accents correctly. */
export function guestListTemplate(): string {
  return "﻿Name,Group,RSVP\r\n";
}
