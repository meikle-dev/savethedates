import { describe, expect, it } from "vitest";
import {
  applyAssignments, autoSeat, clearTable, freeSeats, initials, inverseAssignments, maxTableSeats, minTableSeats, nextTableName, occupancy,
  placeGuest, planSummary, reseatForResize, seatingRows, seatMany, shapeInfo, sortTables, tableGeometry, tableShapes, unseat, unseatedGuests,
  type PlanGuest, type PlanTable, type TableGeometry,
} from "./seating";

const table = (id: string, seats: number, extra: Partial<PlanTable> = {}): PlanTable => ({ id, name: id, shape: "round", seats, keptEmpty: [], position: 0, ...extra });
const guest = (id: string, extra: Partial<PlanGuest> = {}): PlanGuest => ({ id, name: id, group: "", status: "attending", tableId: null, seat: null, ...extra });
const at = (tableId: string, seat: number) => ({ tableId, seat });
const group = (name: string, size: number, prefix = name) => Array.from({ length: size }, (_, index) => guest(`${prefix}${index + 1}`, { group: name }));
const seatsOf = (assignments: { guestId: string; tableId: string | null; seat: number | null }[], tableId: string) =>
  assignments.filter((assignment) => assignment.tableId === tableId).map((assignment) => assignment.seat);

describe("tables", () => {
  it("describes every shape", () => {
    expect(Object.keys(shapeInfo)).toEqual([...tableShapes]);
    expect(shapeInfo.top).toEqual({ label: "Top table", defaultSeats: 8, description: "One long side, facing the room" });
  });

  it("orders tables by position then natural name", () => {
    const tables = [table("a", 8, { name: "Table 10", position: 1 }), table("b", 8, { name: "Table 2", position: 1 }), table("c", 8, { name: "Top table", position: 0 })];
    expect(sortTables(tables).map((item) => item.name)).toEqual(["Top table", "Table 2", "Table 10"]);
    expect(tables[0].name).toBe("Table 10");
  });

  it("finds free seats around kept-empty and taken seats", () => {
    const t = table("t", 6, { keptEmpty: [2, 5] });
    const guests = [guest("a", at("t", 1)), guest("b", at("t", 4)), guest("c", at("other", 3))];
    expect(freeSeats(t, guests)).toEqual([3, 6]);
    expect(occupancy(t, guests)).toEqual({ seated: 2, free: 2, keptEmpty: 2 });
  });

  it("lists guests still needing a seat, ignoring declined guests", () => {
    const guests = [guest("a"), guest("b", at("t", 1)), guest("c", { status: "declined" }), guest("d", { status: "awaiting" })];
    expect(unseatedGuests(guests).map((item) => item.id)).toEqual(["a", "d"]);
  });
});

describe("placeGuest", () => {
  const tables = [table("t", 4, { keptEmpty: [3] }), table("u", 2)];

  it("uses the first free seat when no seat is given", () => {
    const guests = [guest("a", at("t", 1)), guest("b")];
    expect(placeGuest(tables, guests, "b", "t")).toEqual({ ok: true, assignments: [{ guestId: "b", tableId: "t", seat: 2 }] });
  });

  it("puts a guest at a specific empty seat", () => {
    expect(placeGuest(tables, [guest("a")], "a", "t", 4)).toEqual({ ok: true, assignments: [{ guestId: "a", tableId: "t", seat: 4 }] });
  });

  it("swaps two seated guests", () => {
    const guests = [guest("a", at("t", 1)), guest("b", at("u", 2))];
    const result = placeGuest(tables, guests, "a", "u", 2);
    expect(result).toEqual({ ok: true, assignments: [{ guestId: "a", tableId: "u", seat: 2 }, { guestId: "b", tableId: "t", seat: 1 }] });
    const after = applyAssignments(guests, result.ok ? result.assignments : []);
    expect(after.map((item) => [item.tableId, item.seat])).toEqual([["u", 2], ["t", 1]]);
    const back = placeGuest(tables, after, "a", "t", 1);
    expect(applyAssignments(after, back.ok ? back.assignments : [])).toEqual(guests);
  });

  it("unseats the occupant when the mover had no seat", () => {
    const guests = [guest("a", at("t", 2)), guest("b")];
    expect(placeGuest(tables, guests, "b", "t", 2)).toEqual({ ok: true, assignments: [{ guestId: "b", tableId: "t", seat: 2 }, { guestId: "a", tableId: null, seat: null }] });
  });

  it("refuses full tables, kept-empty seats, missing seats, declined and unknown guests", () => {
    const guests = [guest("a", at("u", 1)), guest("b", at("u", 2)), guest("c"), guest("d", { status: "declined" })];
    expect(placeGuest(tables, guests, "c", "u")).toEqual({ ok: false, reason: "full" });
    expect(placeGuest(tables, guests, "c", "t", 3)).toEqual({ ok: false, reason: "kept_empty" });
    expect(placeGuest(tables, guests, "c", "t", 5)).toEqual({ ok: false, reason: "no_seat" });
    expect(placeGuest(tables, guests, "c", "t", 0)).toEqual({ ok: false, reason: "no_seat" });
    expect(placeGuest(tables, guests, "d", "t")).toEqual({ ok: false, reason: "declined" });
    expect(placeGuest(tables, guests, "zz", "t")).toEqual({ ok: false, reason: "unknown" });
    expect(placeGuest(tables, guests, "c", "zz")).toEqual({ ok: false, reason: "unknown" });
  });

  it("does nothing when the guest already sits there", () => {
    const guests = [guest("a", at("u", 2))];
    expect(placeGuest(tables, guests, "a", "u", 2)).toEqual({ ok: true, assignments: [] });
    expect(placeGuest(tables, guests, "a", "u")).toEqual({ ok: true, assignments: [] });
  });
});

describe("seatMany, unseat and clearTable", () => {
  it("fills free seats in order and returns the overflow", () => {
    const tables = [table("t", 4, { keptEmpty: [2] }), table("u", 4)];
    const guests = [guest("a", at("t", 1)), guest("b", at("u", 3)), guest("c"), guest("d", { status: "declined" }), guest("e"), guest("f")];
    expect(seatMany(tables, guests, ["b", "d", "c", "a", "e", "f", "c"], "t")).toEqual({
      assignments: [{ guestId: "b", tableId: "t", seat: 3 }, { guestId: "c", tableId: "t", seat: 4 }],
      left: ["d", "e", "f"],
    });
    expect(seatMany(tables, guests, ["c"], "zz")).toEqual({ assignments: [], left: ["c"] });
  });

  it("unseats one guest or a whole table", () => {
    const guests = [guest("a", at("t", 1)), guest("b", at("t", 3)), guest("c", at("u", 1)), guest("d")];
    expect(unseat(guests, "a")).toEqual([{ guestId: "a", tableId: null, seat: null }]);
    expect(unseat(guests, "d")).toEqual([]);
    expect(clearTable(guests, "t")).toEqual([{ guestId: "a", tableId: null, seat: null }, { guestId: "b", tableId: null, seat: null }]);
  });
});

describe("applying and undoing", () => {
  it("applies immutably with later assignments winning, and the inverse restores the original", () => {
    const before = [guest("a", at("t", 1)), guest("b"), guest("c", at("u", 2))];
    const assignments = [{ guestId: "a", tableId: "u", seat: 5 }, { guestId: "b", tableId: "t", seat: 1 }, { guestId: "a", tableId: "u", seat: 2 }, { guestId: "c", tableId: null, seat: null }];
    const after = applyAssignments(before, assignments);
    expect(after.map((item) => [item.id, item.tableId, item.seat])).toEqual([["a", "u", 2], ["b", "t", 1], ["c", null, null]]);
    expect(before[0]).toEqual(guest("a", at("t", 1)));
    expect(applyAssignments(after, inverseAssignments(before, assignments))).toEqual(before);
  });
});

describe("autoSeat", () => {
  it("keeps a group together on consecutive seats", () => {
    const tables = [table("t", 10)];
    const guests = [guest("x", at("t", 1)), guest("y", at("t", 3)), ...group("Smith", 4)];
    const { assignments, unplaced } = autoSeat(tables, guests);
    expect(unplaced).toBe(0);
    expect(seatsOf(assignments, "t")).toEqual([4, 5, 6, 7]);
  });

  it("chooses the tightest table that fits the whole group", () => {
    const tables = [table("big", 10), table("snug", 5, { position: 1 }), table("small", 3, { position: 2 })];
    const { assignments } = autoSeat(tables, group("Jones", 4));
    expect(seatsOf(assignments, "snug")).toEqual([1, 2, 3, 4]);
  });

  it("prefers a table already holding the group", () => {
    const tables = [table("snug", 4), table("family", 10, { position: 1 })];
    const guests = [guest("gran", { group: " jones ", ...at("family", 1) }), ...group("Jones", 3)];
    expect(seatsOf(autoSeat(tables, guests).assignments, "family")).toEqual([2, 3, 4]);
  });

  it("splits a group too big for any table", () => {
    const tables = [table("a", 10), table("b", 10, { position: 1 })];
    const { assignments, unplaced } = autoSeat(tables, group("Party", 12));
    expect(unplaced).toBe(0);
    expect(seatsOf(assignments, "a")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(seatsOf(assignments, "b")).toEqual([1, 2]);
  });

  it("never moves seated guests, uses kept-empty seats or seats declined guests", () => {
    const tables = [table("t", 4, { keptEmpty: [2] })];
    const guests = [guest("s", at("t", 1)), guest("d", { status: "declined" }), guest("a"), guest("b")];
    const { assignments, unplaced } = autoSeat(tables, guests);
    expect(assignments).toEqual([{ guestId: "a", tableId: "t", seat: 3 }, { guestId: "b", tableId: "t", seat: 4 }]);
    expect(unplaced).toBe(0);
  });

  it("reports guests left over when seats run out", () => {
    const { assignments, unplaced } = autoSeat([table("t", 3)], [...group("Brown", 2), guest("a"), guest("b")]);
    expect(assignments.map((item) => item.guestId)).toEqual(["Brown1", "Brown2", "a"]);
    expect(unplaced).toBe(1);
  });

  it("places bigger groups first, then ungrouped guests in table order, deterministically", () => {
    const tables = [table("t2", 4, { name: "Table 2", position: 0 }), table("t10", 6, { name: "Table 10", position: 0 })];
    const guests = [guest("solo"), ...group("Pair", 2), ...group("Six", 6), guest("solo2", { group: "  " })];
    const first = autoSeat(tables, guests);
    expect(first).toEqual(autoSeat(tables, guests));
    expect(seatsOf(first.assignments, "t10")).toEqual([1, 2, 3, 4, 5, 6]);
    expect(first.assignments.slice(6)).toEqual([
      { guestId: "Pair1", tableId: "t2", seat: 1 }, { guestId: "Pair2", tableId: "t2", seat: 2 },
      { guestId: "solo", tableId: "t2", seat: 3 }, { guestId: "solo2", tableId: "t2", seat: 4 },
    ]);
  });
});

describe("reseatForResize", () => {
  it("keeps valid seats, compacts the rest and unseats the overflow", () => {
    const t = table("t", 10);
    const guests = [guest("a", at("t", 1)), guest("b", at("t", 5)), guest("c", at("t", 10)), guest("d", at("t", 9)), guest("e", at("t", 8))];
    expect(reseatForResize(t, guests, 4, [])).toEqual({
      assignments: [{ guestId: "b", tableId: "t", seat: 2 }, { guestId: "e", tableId: "t", seat: 3 }, { guestId: "d", tableId: "t", seat: 4 }, { guestId: "c", tableId: null, seat: null }],
      unseated: ["c"],
    });
  });

  it("moves a guest off a seat newly kept empty", () => {
    const t = table("t", 6);
    const guests = [guest("a", at("t", 1)), guest("b", at("t", 2))];
    expect(reseatForResize(t, guests, 6, [2])).toEqual({ assignments: [{ guestId: "b", tableId: "t", seat: 3 }], unseated: [] });
  });
});

describe("nextTableName", () => {
  it("fills gaps, names top tables and respects names being created", () => {
    expect(nextTableName([{ name: "Table 1" }, { name: "table 3" }], "round")).toBe("Table 2");
    expect(nextTableName([], "long")).toBe("Table 1");
    expect(nextTableName([{ name: "Table 1" }], "square", ["Table 2"])).toBe("Table 3");
    expect(nextTableName([{ name: "Table 1" }], "top")).toBe("Top table");
    expect(nextTableName([{ name: "Top Table" }], "top", ["Top table 2"])).toBe("Top table 3");
  });
});

describe("summary and export", () => {
  const tables = [table("t2", 3, { name: "Table 2", position: 1, keptEmpty: [3] }), table("top", 2, { name: "Top table", position: 0 })];
  const guests = [
    guest("a", { name: "Ann Lee", group: "Lees", ...at("t2", 1) }),
    guest("b", { name: "Bea Ray", ...at("top", 2) }),
    guest("c", { name: "Cal Oak", group: "Oaks" }),
    guest("d", { name: "Dee", status: "declined" }),
  ];

  it("summarises the plan", () => {
    expect(planSummary(tables, guests)).toEqual({ toSeat: 3, seated: 2, seats: 5, keptEmpty: 1, free: 2, tables: 2 });
  });

  it("exports every seat in display order, then guests not seated yet", () => {
    expect(seatingRows(tables, guests)).toEqual([
      ["Table", "Seat", "Guest", "Group"],
      ["Top table", "1", "Empty seat", ""],
      ["Top table", "2", "Bea Ray", ""],
      ["Table 2", "1", "Ann Lee", "Lees"],
      ["Table 2", "2", "Empty seat", ""],
      ["Table 2", "3", "Empty seat (kept free)", ""],
      ["Not seated yet", "", "Cal Oak", "Oaks"],
    ]);
  });
});

describe("initials", () => {
  it("takes the first and last words' first letters", () => {
    expect(initials("Mary Anne Jones")).toBe("MJ");
    expect(initials("Cher")).toBe("C");
    expect(initials("Dr. Ada Lovelace")).toBe("DL");
    expect(initials("  émile   zola ")).toBe("ÉZ");
    expect(initials("Émile")).toBe("É");
    expect(initials("🎉 party")).toBe("🎉P");
    expect(initials("")).toBe("");
  });
});

describe("tableGeometry", () => {
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const bodyGap = ({ body }: TableGeometry, seat: { x: number; y: number }) => {
    if (body.kind === "circle") return distance(seat, { x: body.cx, y: body.cy }) - body.r;
    const x = Math.min(Math.max(seat.x, body.x), body.x + body.width);
    const y = Math.min(Math.max(seat.y, body.y), body.y + body.height);
    return distance(seat, { x, y });
  };

  it("lays out every shape and size without overlaps, inside the view box", () => {
    for (const shape of tableShapes) {
      for (let seats = minTableSeats; seats <= maxTableSeats; seats += 1) {
        const geometry = tableGeometry(shape, seats);
        const where = `${shape} ${seats}`;
        expect(geometry.seats, where).toHaveLength(seats);
        for (const [index, seat] of geometry.seats.entries()) {
          expect(seat.x - 5, where).toBeGreaterThanOrEqual(0);
          expect(seat.y - 5, where).toBeGreaterThanOrEqual(0);
          expect(seat.x + 5, where).toBeLessThanOrEqual(geometry.width);
          expect(seat.y + 5, where).toBeLessThanOrEqual(geometry.height);
          expect(bodyGap(geometry, seat), where).toBeGreaterThanOrEqual(5);
          for (const other of geometry.seats.slice(index + 1)) expect(distance(seat, other), where).toBeGreaterThanOrEqual(10);
        }
        const { body } = geometry;
        if (body.kind === "circle") {
          expect(body.r).toBeGreaterThanOrEqual(12);
          expect(body.cx - body.r).toBeGreaterThan(0);
          expect(body.cx + body.r).toBeLessThan(geometry.width);
        } else {
          expect(body.x).toBeGreaterThan(0);
          expect(body.y).toBeGreaterThan(0);
          expect(body.x + body.width).toBeLessThan(geometry.width);
          expect(body.y + body.height).toBeLessThan(geometry.height);
        }
      }
    }
  });

  it("starts round tables at the top and goes clockwise", () => {
    const { body, seats: [first, second] } = tableGeometry("round", 8);
    expect(body).toMatchObject({ kind: "circle", cx: first.x });
    expect(first.y).toBeLessThan(second.y);
    expect(second.x).toBeGreaterThan(first.x);
  });

  it("numbers long tables clockwise: along the top, then back along the bottom", () => {
    const { seats, body } = tableGeometry("long", 7);
    const top = seats.slice(0, 4);
    const bottom = seats.slice(4);
    expect(body.kind).toBe("rect");
    if (body.kind !== "rect") return;
    for (const seat of top) expect(seat.y).toBeLessThan(body.y);
    for (const seat of bottom) expect(seat.y).toBeGreaterThan(body.y + body.height);
    expect(top.map((seat) => seat.x)).toEqual([...top.map((seat) => seat.x)].sort((a, b) => a - b));
    expect(bottom.map((seat) => seat.x)).toEqual([...bottom.map((seat) => seat.x)].sort((a, b) => b - a));
    expect(tableGeometry("long", 1).seats[0].y).toBeLessThan(body.y);
  });

  it("puts top-table seats along one side and spreads square seats over four sides", () => {
    const top = tableGeometry("top", 5);
    expect(new Set(top.seats.map((seat) => seat.y)).size).toBe(1);
    expect(top.body.kind === "rect" && top.body.height).toBe(14);
    const square = tableGeometry("square", 7);
    const ys = square.seats.map((seat) => seat.y);
    expect(ys.filter((y) => y === ys[0])).toHaveLength(2); // top gets an extra seat
    expect(square.width).toBe(square.height);
  });
});
