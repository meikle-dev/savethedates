// F079: the table planner's seating engine. Pure, so the client planner can apply changes optimistically and the
// rules are unit tested. The database separately enforces seat range, kept-empty seats, one guest per seat and that
// declined guests are never seated.

export const tableShapes = ["round", "long", "square", "top"] as const;
export type TableShape = (typeof tableShapes)[number];
export const shapeInfo: Record<TableShape, { label: string; defaultSeats: number; description: string }> = {
  round: { label: "Round", defaultSeats: 10, description: "Guests all the way round" },
  long: { label: "Long", defaultSeats: 12, description: "Rectangular, seats along both sides" },
  square: { label: "Square", defaultSeats: 8, description: "Seats on all four sides" },
  top: { label: "Top table", defaultSeats: 8, description: "One long side, facing the room" },
};
export const minTableSeats = 1;
export const maxTableSeats = 30;
export const maxTables = 100;
export const maxTableNameLength = 40;

import type { GuestStatus } from "./guest-import";
export type { GuestStatus };
export type PlanTable = { id: string; name: string; shape: TableShape; seats: number; keptEmpty: number[]; position: number };
export type PlanGuest = { id: string; name: string; group: string; status: GuestStatus; tableId: string | null; seat: number | null };
/** A change to one guest's place. tableId and seat are both null (unseated) or both set. */
export type Assignment = { guestId: string; tableId: string | null; seat: number | null };

const isSeated = (guest: PlanGuest) => guest.tableId !== null && guest.seat !== null;
const placeOf = (guest: PlanGuest) => isSeated(guest) ? { tableId: guest.tableId, seat: guest.seat } : { tableId: null, seat: null };
const seatsAt = (tableId: string, guests: PlanGuest[]) => guests.filter((guest) => guest.tableId === tableId && guest.seat !== null);
const range = (count: number) => Array.from({ length: Math.max(0, count) }, (_, index) => index + 1);
const groupKey = (guest: PlanGuest) => guest.group.trim().toLowerCase();

/** Tables in display order: by position, then name (so "Table 2" comes before "Table 10"). */
export function sortTables(tables: PlanTable[]): PlanTable[] {
  return [...tables].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, undefined, { numeric: true }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Seat numbers at this table that have no guest and aren't kept empty, ascending. */
export function freeSeats(table: PlanTable, guests: PlanGuest[]): number[] {
  const taken = new Set(seatsAt(table.id, guests).map((guest) => guest.seat));
  const kept = new Set(table.keptEmpty);
  return range(table.seats).filter((seat) => !taken.has(seat) && !kept.has(seat));
}

export function occupancy(table: PlanTable, guests: PlanGuest[]): { seated: number; free: number; keptEmpty: number } {
  return {
    seated: seatsAt(table.id, guests).length,
    free: freeSeats(table, guests).length,
    keptEmpty: new Set(table.keptEmpty.filter((seat) => seat >= 1 && seat <= table.seats)).size,
  };
}

/** Guests who still need a seat: not declined and unseated. */
export function unseatedGuests(guests: PlanGuest[]): PlanGuest[] {
  return guests.filter((guest) => guest.status !== "declined" && !isSeated(guest));
}

export type PlaceResult = { ok: true; assignments: Assignment[] } | { ok: false; reason: "declined" | "full" | "kept_empty" | "no_seat" | "unknown" };

/** Put a guest at a table: the first free seat, or a given seat (swapping with whoever sits there). Returns only the changes. */
export function placeGuest(tables: PlanTable[], guests: PlanGuest[], guestId: string, tableId: string, seat?: number): PlaceResult {
  const guest = guests.find((item) => item.id === guestId);
  const table = tables.find((item) => item.id === tableId);
  if (!guest || !table) return { ok: false, reason: "unknown" };
  if (guest.status === "declined") return { ok: false, reason: "declined" };
  if (seat === undefined) {
    if (guest.tableId === tableId && guest.seat !== null) return { ok: true, assignments: [] };
    const [first] = freeSeats(table, guests);
    return first === undefined ? { ok: false, reason: "full" } : { ok: true, assignments: [{ guestId, tableId, seat: first }] };
  }
  if (!Number.isInteger(seat) || seat < 1 || seat > table.seats) return { ok: false, reason: "no_seat" };
  if (table.keptEmpty.includes(seat)) return { ok: false, reason: "kept_empty" };
  if (guest.tableId === tableId && guest.seat === seat) return { ok: true, assignments: [] };
  const assignments: Assignment[] = [{ guestId, tableId, seat }];
  const occupant = guests.find((item) => item.id !== guestId && item.tableId === tableId && item.seat === seat);
  if (occupant) assignments.push({ guestId: occupant.id, ...placeOf(guest) });
  return { ok: true, assignments };
}

/** Seat several guests at one table in order, into its free seats ascending. Guests already at this table stay put;
 *  unknown, declined and overflowing guests are returned in `left`. */
export function seatMany(tables: PlanTable[], guests: PlanGuest[], guestIds: string[], tableId: string): { assignments: Assignment[]; left: string[] } {
  const ids = [...new Set(guestIds)];
  const table = tables.find((item) => item.id === tableId);
  if (!table) return { assignments: [], left: ids };
  const byId = new Map(guests.map((guest) => [guest.id, guest]));
  const free = freeSeats(table, guests);
  const assignments: Assignment[] = [];
  const left: string[] = [];
  for (const id of ids) {
    const guest = byId.get(id);
    if (guest && guest.tableId === tableId && guest.seat !== null) continue;
    const seat = guest && guest.status !== "declined" ? free.shift() : undefined;
    if (seat === undefined) left.push(id);
    else assignments.push({ guestId: id, tableId, seat });
  }
  return { assignments, left };
}

export function unseat(guests: PlanGuest[], guestId: string): Assignment[] {
  const guest = guests.find((item) => item.id === guestId);
  return guest && (guest.tableId !== null || guest.seat !== null) ? [{ guestId, tableId: null, seat: null }] : [];
}

export function clearTable(guests: PlanGuest[], tableId: string): Assignment[] {
  return guests.filter((guest) => guest.tableId === tableId).map((guest) => ({ guestId: guest.id, tableId: null, seat: null }));
}

/** Apply assignments immutably (later assignments for the same guest win). */
export function applyAssignments(guests: PlanGuest[], assignments: Assignment[]): PlanGuest[] {
  if (!assignments.length) return guests;
  const latest = new Map(assignments.map((assignment) => [assignment.guestId, assignment]));
  return guests.map((guest) => {
    const change = latest.get(guest.id);
    return change ? { ...guest, tableId: change.tableId, seat: change.seat } : guest;
  });
}

/** The assignments that undo `assignments` given the guests BEFORE they were applied. */
export function inverseAssignments(before: PlanGuest[], assignments: Assignment[]): Assignment[] {
  const byId = new Map(before.map((guest) => [guest.id, guest]));
  return [...new Set(assignments.map((assignment) => assignment.guestId))].flatMap((guestId) => {
    const guest = byId.get(guestId);
    return guest ? [{ guestId, tableId: guest.tableId, seat: guest.seat }] : [];
  });
}

// The lowest run of `count` consecutive free seats, else simply the lowest free seats. `free` is ascending.
function pickSeats(free: number[], count: number) {
  for (let index = 0; index + count <= free.length; index += 1) {
    if (free[index + count - 1] - free[index] === count - 1) return free.slice(index, index + count);
  }
  return free.slice(0, count);
}

/** Seat every unseated, non-declined guest, keeping groups together. Never moves anyone already seated and never uses
 *  kept-empty seats. Grouped guests are placed first (largest group first), then guests without a group. */
export function autoSeat(tables: PlanTable[], guests: PlanGuest[]): { assignments: Assignment[]; unplaced: number } {
  const ordered = sortTables(tables);
  const free = new Map(ordered.map((table) => [table.id, freeSeats(table, guests)]));
  const groupsAt = new Map(ordered.map((table) => [table.id, new Set<string>()]));
  for (const guest of guests) if (isSeated(guest) && groupKey(guest)) groupsAt.get(guest.tableId as string)?.add(groupKey(guest));
  const room = (table: PlanTable) => (free.get(table.id) as number[]).length;
  const assignments: Assignment[] = [];
  let unplaced = 0;

  function seat(table: PlanTable, members: PlanGuest[], seats: number[], key: string) {
    const remaining = free.get(table.id) as number[];
    members.forEach((member, index) => assignments.push({ guestId: member.id, tableId: table.id, seat: seats[index] }));
    free.set(table.id, remaining.filter((number) => !seats.includes(number)));
    if (key) groupsAt.get(table.id)?.add(key);
  }

  const units = new Map<string, PlanGuest[]>();
  const singles: PlanGuest[] = [];
  for (const guest of unseatedGuests(guests)) {
    const key = groupKey(guest);
    if (!key) singles.push(guest);
    else units.set(key, [...(units.get(key) ?? []), guest]);
  }
  // Array sort is stable, so equal sizes keep first-appearance order.
  for (const [key, members] of [...units].sort((a, b) => b[1].length - a[1].length)) {
    let rest = members;
    while (rest.length) {
      const fits = ordered.filter((table) => room(table) >= rest.length);
      if (fits.length) {
        const withGroup = fits.filter((table) => groupsAt.get(table.id)?.has(key));
        const table = (withGroup.length ? withGroup : fits).reduce((best, table) => room(table) < room(best) ? table : best);
        seat(table, rest, pickSeats(free.get(table.id) as number[], rest.length), key);
        break;
      }
      // Too big for any one table: fill the roomiest and carry on with the rest.
      const roomiest = ordered.reduce<PlanTable | null>((best, table) => room(table) > (best ? room(best) : 0) ? table : best, null);
      if (!roomiest) {
        unplaced += rest.length;
        break;
      }
      const count = room(roomiest);
      seat(roomiest, rest.slice(0, count), (free.get(roomiest.id) as number[]).slice(0, count), key);
      rest = rest.slice(count);
    }
  }
  for (const guest of singles) {
    const table = ordered.find((item) => room(item) > 0);
    if (table) seat(table, [guest], [(free.get(table.id) as number[])[0]], "");
    else unplaced += 1;
  }
  return { assignments, unplaced };
}

/** When a table's seat count or kept-empty seats change: guests whose seat is still valid keep it; the rest move to the
 *  lowest remaining free seats in their current seat order; any that don't fit are unseated. */
export function reseatForResize(table: PlanTable, guests: PlanGuest[], seats: number, keptEmpty: number[]): { assignments: Assignment[]; unseated: string[] } {
  const kept = new Set(keptEmpty);
  const taken = new Set<number>();
  const movers: PlanGuest[] = [];
  for (const guest of [...seatsAt(table.id, guests)].sort((a, b) => (a.seat as number) - (b.seat as number))) {
    const seat = guest.seat as number;
    if (seat >= 1 && seat <= seats && !kept.has(seat) && !taken.has(seat)) taken.add(seat);
    else movers.push(guest);
  }
  const free = range(seats).filter((seat) => !kept.has(seat) && !taken.has(seat));
  const assignments: Assignment[] = [];
  const unseated: string[] = [];
  for (const guest of movers) {
    const seat = free.shift();
    if (seat === undefined) {
      assignments.push({ guestId: guest.id, tableId: null, seat: null });
      unseated.push(guest.id);
    } else assignments.push({ guestId: guest.id, tableId: table.id, seat });
  }
  return { assignments, unseated };
}

/** A default name for a new table: "Top table" (then "Top table 2", …) or the lowest unused "Table N". */
export function nextTableName(tables: { name: string }[], shape: TableShape, taken: string[] = []): string {
  const used = new Set([...tables.map((table) => table.name), ...taken].map((name) => name.trim().toLowerCase()));
  const name = (n: number) => shape === "top" ? (n === 1 ? "Top table" : `Top table ${n}`) : `Table ${n}`;
  let n = 1;
  while (used.has(name(n).toLowerCase())) n += 1;
  return name(n);
}

/** Figures for the summary line. Only guests at known tables count as seated. */
export function planSummary(tables: PlanTable[], guests: PlanGuest[]): { toSeat: number; seated: number; seats: number; keptEmpty: number; free: number; tables: number } {
  const summary = { toSeat: guests.filter((guest) => guest.status !== "declined").length, seated: 0, seats: 0, keptEmpty: 0, free: 0, tables: tables.length };
  for (const table of tables) {
    const counts = occupancy(table, guests);
    summary.seated += counts.seated;
    summary.seats += table.seats;
    summary.keptEmpty += counts.keptEmpty;
    summary.free += counts.free;
  }
  return summary;
}

/** Export rows, header first: every seat of every table in display order, then guests not seated yet. */
export function seatingRows(tables: PlanTable[], guests: PlanGuest[]): string[][] {
  const rows = [["Table", "Seat", "Guest", "Group"]];
  for (const table of sortTables(tables)) {
    const bySeat = new Map(seatsAt(table.id, guests).map((guest) => [guest.seat, guest]));
    for (const seat of range(table.seats)) {
      const guest = bySeat.get(seat);
      const empty = table.keptEmpty.includes(seat) ? "Empty seat (kept free)" : "Empty seat";
      rows.push([table.name, String(seat), guest ? guest.name : empty, guest ? guest.group : ""]);
    }
  }
  for (const guest of unseatedGuests(guests)) rows.push(["Not seated yet", "", guest.name, guest.group]);
  return rows;
}

// A word's first letter or number, so "Dr." gives "D" and "(Sam)" gives "S"; otherwise its first code point (emoji).
function firstCharacter(word: string) {
  return word.match(/[\p{L}\p{N}]/u)?.[0] ?? Array.from(word)[0] ?? "";
}

/** Up to 2 initials for a seat badge: the first and last words' first letters. */
export function initials(name: string): string {
  const words = name.normalize("NFC").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const first = firstCharacter(words[0]);
  return (words.length > 1 ? first + firstCharacter(words[words.length - 1]) : first).toUpperCase();
}

export type TableGeometry = {
  width: number;
  height: number;
  body: { kind: "circle"; cx: number; cy: number; r: number } | { kind: "rect"; x: number; y: number; width: number; height: number };
  seats: { x: number; y: number }[];
};

// Seats are circles of diameter 10 whose edges sit 3 units off the table, 13 units apart centre to centre (a 3-unit gap).
const seatRadius = 5;
const seatOffset = 3 + seatRadius;
const pitch = 2 * seatRadius + 3;
const margin = 2;
const minBody = 24;
const outside = margin + 2 * seatRadius + 3;
const round2 = (value: number) => Math.round(value * 100) / 100;
const point = (x: number, y: number) => ({ x: round2(x), y: round2(y) });

// Centres of `count` seats spread evenly along a side of `length` starting at `start`, in increasing order.
function along(start: number, length: number, count: number) {
  return Array.from({ length: count }, (_, index) => start + length / 2 + (index - (count - 1) / 2) * pitch);
}

/** Geometry for drawing a table and its seats in an SVG viewBox. `seats[i]` is seat i + 1, numbered clockwise. */
export function tableGeometry(shape: TableShape, seats: number): TableGeometry {
  const count = Math.max(0, Math.floor(seats));
  if (shape === "round") {
    // The chord between neighbouring seat centres must be at least one pitch.
    const ring = Math.max(minBody / 2 + seatOffset, count > 1 ? pitch / (2 * Math.sin(Math.PI / count)) : 0);
    const centre = ring + seatRadius + margin;
    return {
      width: round2(2 * centre),
      height: round2(2 * centre),
      body: { kind: "circle", cx: round2(centre), cy: round2(centre), r: round2(ring - seatOffset) },
      seats: range(count).map((number) => {
        const angle = (2 * Math.PI * (number - 1)) / count;
        return point(centre + ring * Math.sin(angle), centre - ring * Math.cos(angle));
      }),
    };
  }
  if (shape === "square") {
    const base = Math.floor(count / 4);
    const extra = count % 4;
    const [top, right, bottom, left] = [base + (extra >= 1 ? 1 : 0), base + (extra >= 3 ? 1 : 0), base + (extra >= 2 ? 1 : 0), base];
    const side = Math.max(minBody, Math.max(top, right, bottom, left) * pitch);
    const near = outside - seatOffset;
    const far = outside + side + seatOffset;
    return {
      width: side + 2 * outside,
      height: side + 2 * outside,
      body: { kind: "rect", x: outside, y: outside, width: side, height: side },
      seats: [
        ...along(outside, side, top).map((x) => point(x, near)),
        ...along(outside, side, right).map((y) => point(far, y)),
        ...along(outside, side, bottom).reverse().map((x) => point(x, far)),
        ...along(outside, side, left).reverse().map((y) => point(near, y)),
      ],
    };
  }
  const top = shape === "top" ? count : Math.ceil(count / 2);
  const bottom = count - top;
  const length = Math.max(minBody, top * pitch);
  const depth = shape === "top" ? 14 : 20;
  const below = outside + depth + seatOffset;
  return {
    width: length + 2 * margin,
    height: bottom ? below + seatRadius + margin : outside + depth + margin,
    body: { kind: "rect", x: margin, y: outside, width: length, height: depth },
    seats: [
      ...along(margin, length, top).map((x) => point(x, outside - seatOffset)),
      ...along(margin, length, bottom).reverse().map((x) => point(x, below)),
    ],
  };
}
