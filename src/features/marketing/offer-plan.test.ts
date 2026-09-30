import { describe, expect, it } from "vitest";
import { emptyDemoReply, type DemoReply } from "./offer-demo";
import { demoAutoSeat, demoGuests, demoNotAttending, demoPlace, demoPlanGuests, demoTables, demoUnseat, initialDemoPlan, planDemoSummary, visitorId } from "./offer-plan";

const none = emptyDemoReply();
const accepting = (name: string): DemoReply => ({ ...emptyDemoReply(), name, attending: true });
const seatOf = (guests: ReturnType<typeof demoPlanGuests>, name: string) => {
  const guest = guests.find((item) => item.name === name)!;
  return [guest.tableId, guest.seat];
};

describe("table plan demo", () => {
  it("starts with a full top table, 19 guests to seat and one decline", () => {
    const plan = initialDemoPlan();
    expect(new Set(demoGuests.map((guest) => guest.id)).size).toBe(demoGuests.length);
    expect(planDemoSummary(demoPlanGuests(plan, none))).toMatchObject({ seated: 6, toSeat: 25, empty: 22, tables: 3 });
    expect(demoNotAttending(plan, none)).toEqual(["Ben Carter"]);
  });

  it("seats everyone with groups kept together, never in the kept-empty seat", () => {
    const { plan, message, seated } = demoAutoSeat(initialDemoPlan(), none);
    const guests = demoPlanGuests(plan, none);
    expect(message).toBe("19 guests seated.");
    expect(seated).toHaveLength(19);
    expect(planDemoSummary(guests)).toMatchObject({ seated: 25, free: 2, keptEmpty: 1 });
    for (const [group, table] of [["Olivia’s family", "table-1"], ["University friends", "table-2"], ["James’s family", "table-2"], ["Work friends", "table-2"]]) {
      expect(new Set(guests.filter((guest) => guest.group === group).map((guest) => guest.tableId)), group).toEqual(new Set([table]));
    }
    expect(guests.some((guest) => guest.tableId === "table-1" && guest.seat === 10)).toBe(false);
    expect(seatOf(guests, "Ben Carter")).toEqual([null, null]);
  });

  it("moves, swaps, refuses the kept-empty seat and unseats, as the workspace does", () => {
    let { plan } = demoAutoSeat(initialDemoPlan(), none);
    const amelia = demoGuests.find((guest) => guest.name === "Amelia Hart")!.id;
    const rhys = demoGuests.find((guest) => guest.name === "Rhys Evans")!;
    const free = demoPlace(plan, none, amelia, "table-1", 8);
    expect(free.message).toBe("Amelia Hart seated at Table 1, seat 8.");
    const swap = demoPlace(free.plan, none, amelia, "table-2", 11);
    expect(swap.message).toBe("Amelia Hart and Rhys Evans swapped places.");
    expect(seatOf(demoPlanGuests(swap.plan, none), "Rhys Evans")).toEqual(["table-1", 8]);
    const kept = demoPlace(swap.plan, none, rhys.id, "table-1", 10);
    expect(kept).toMatchObject({ refused: true, message: "Seat 10 at Table 1 is kept empty.", plan: swap.plan });
    plan = demoUnseat(swap.plan, none, amelia).plan;
    expect(seatOf(demoPlanGuests(plan, none), "Amelia Hart")).toEqual([null, null]);
  });

  it("adds the visitor who accepted in the RSVP demo, and keeps their seat while they attend", () => {
    const reply = accepting("Jo Example");
    const seatedAll = demoAutoSeat(initialDemoPlan(), reply);
    expect(seatedAll.message).toBe("20 guests seated.");
    const guests = demoPlanGuests(seatedAll.plan, reply);
    const visitor = guests.find((guest) => guest.id === visitorId)!;
    expect(visitor).toMatchObject({ name: "Jo Example", group: "", status: "attending" });
    expect(visitor.seat).not.toBeNull();
    expect(planDemoSummary(guests)).toMatchObject({ seated: 26, toSeat: 26, free: 1 });
    // Declining removes them from the plan and lists them as not attending; accepting again restores their seat.
    const declined = { ...reply, attending: false };
    expect(demoPlanGuests(seatedAll.plan, declined).some((guest) => guest.id === visitorId)).toBe(false);
    expect(demoNotAttending(seatedAll.plan, declined)).toEqual(["Ben Carter", "Jo Example"]);
    expect(demoPlanGuests(seatedAll.plan, reply).find((guest) => guest.id === visitorId)!.seat).toBe(visitor.seat);
  });

  it("sends a returning visitor to be seated when someone else took their seat", () => {
    const reply = accepting("");
    const { plan } = demoAutoSeat(initialDemoPlan(), reply);
    const visitor = demoPlanGuests(plan, reply).find((guest) => guest.id === visitorId)!;
    expect(visitor.name).toBe("You");
    const away = { ...reply, attending: false };
    const harriet = demoGuests.find((guest) => guest.name === "Harriet Lowe")!.id;
    const taken = demoPlace(plan, away, harriet, visitor.tableId!, visitor.seat!).plan;
    expect(demoPlanGuests(taken, reply).find((guest) => guest.id === visitorId)).toMatchObject({ tableId: null, seat: null });
  });

  it("keeps the demo tables within the planner's limits", () => {
    for (const table of demoTables) expect(table.keptEmpty.every((seat) => seat <= table.seats)).toBe(true);
  });
});
