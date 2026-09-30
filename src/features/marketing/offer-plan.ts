// F079: the table plan demo on /what-we-offer. Olivia and James's fictional guests, seated with the planner's own
// engine, so the demo behaves exactly as the workspace does. Pure, so it is unit tested; nothing is sent or saved.
import { applyAssignments, autoSeat, placeGuest, planSummary, unseat, type Assignment, type PlanGuest, type PlanTable } from "../planning/seating";
import type { DemoReply } from "./offer-demo";

export const demoTables: PlanTable[] = [
  { id: "top", name: "Top table", shape: "top", seats: 6, keptEmpty: [], position: 0 },
  { id: "table-1", name: "Table 1", shape: "round", seats: 10, keptEmpty: [10], position: 1 },
  { id: "table-2", name: "Table 2", shape: "long", seats: 12, keptEmpty: [], position: 2 },
];

const groups: [group: string, names: string[]][] = [
  ["Olivia’s family", ["Amelia Hart", "Tom Hart", "Ruth Bennett", "Callum Bennett", "Nora Bennett-Hughes", "Declan Hughes"]],
  ["University friends", ["Priya Shah", "Grace O’Neill", "Sam Okafor", "Isla MacLeod", "Kofi Mensah"]],
  ["James’s family", ["Patrick Walsh", "Aoife Walsh", "Eleanor Fitzgerald-Walsh", "Conor Walsh", "Niamh Doyle"]],
  ["Work friends", ["Rhys Evans", "Fatima Begum"]],
];
const topTable = ["Margaret Bennett", "Peter Bennett", "Olivia Bennett", "James Walsh", "Siobhán Walsh", "Liam Walsh"];
const person = (name: string, group: string, status: PlanGuest["status"] = "attending", seat: number | null = null): PlanGuest =>
  ({ id: name.toLowerCase().replace(/[^a-z]+/g, "-"), name, group, status, tableId: seat === null ? null : "top", seat });

/** The couple and wedding party already at the top table, four groups and one guest still to seat, and one decline. */
export const demoGuests: PlanGuest[] = [
  ...topTable.map((name, index) => person(name, "Wedding party", "attending", index + 1)),
  ...groups.flatMap(([group, names]) => names.map((name) => person(name, group))),
  person("Harriet Lowe", "", "awaiting"),
  person("Ben Carter", "", "declined"),
];

/** The visitor's own example reply from the RSVP demo, once it accepts. */
export const visitorId = "visitor";
type Place = { tableId: string | null; seat: number | null };
export type DemoPlan = { guests: PlanGuest[]; visitor: Place };
export const initialDemoPlan = (): DemoPlan => ({ guests: demoGuests, visitor: { tableId: null, seat: null } });

/** Everyone in the plan. A visitor whose seat went to someone else while they weren't attending waits to be seated. */
export function demoPlanGuests(plan: DemoPlan, reply: DemoReply): PlanGuest[] {
  if (reply.attending !== true) return plan.guests;
  const { tableId, seat } = plan.visitor;
  const taken = plan.guests.some((guest) => guest.tableId === tableId && guest.seat === seat);
  return [...plan.guests, { id: visitorId, name: reply.name || "You", group: "", status: "attending", tableId: taken ? null : tableId, seat: taken ? null : seat }];
}

/** Names shown as not attending, so not seated: the fictional decline, and the visitor if they declined. */
export function demoNotAttending(plan: DemoPlan, reply: DemoReply): string[] {
  const names = plan.guests.filter((guest) => guest.status === "declined").map((guest) => guest.name);
  return reply.attending === false ? [...names, reply.name || "You"] : names;
}

function apply(plan: DemoPlan, everyone: PlanGuest[], assignments: Assignment[]): DemoPlan {
  const after = applyAssignments(everyone, assignments);
  const visitor = after.find((guest) => guest.id === visitorId);
  return { guests: after.filter((guest) => guest.id !== visitorId), visitor: visitor ? { tableId: visitor.tableId, seat: visitor.seat } : plan.visitor };
}

export type DemoResult = { plan: DemoPlan; message: string; refused?: boolean; seated?: string[] };

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

/** "Seat everyone automatically", with the workspace's wording. `seated` lists who moved, in seating order. */
export function demoAutoSeat(plan: DemoPlan, reply: DemoReply): DemoResult {
  const everyone = demoPlanGuests(plan, reply);
  const { assignments, unplaced } = autoSeat(demoTables, everyone);
  return {
    plan: apply(plan, everyone, assignments),
    message: `${plural(assignments.length, "guest")} seated${unplaced ? `. ${plural(unplaced, "guest")} still need${unplaced === 1 ? "s" : ""} a seat` : ""}.`,
    seated: assignments.map((assignment) => assignment.guestId),
  };
}

/** Put the chosen guest in a seat, swapping with whoever sits there. */
export function demoPlace(plan: DemoPlan, reply: DemoReply, guestId: string, tableId: string, seat: number): DemoResult {
  const everyone = demoPlanGuests(plan, reply);
  const nameOf = (id: string) => everyone.find((guest) => guest.id === id)?.name ?? "";
  const table = demoTables.find((item) => item.id === tableId);
  const result = placeGuest(demoTables, everyone, guestId, tableId, seat);
  if (!result.ok) {
    const reason = result.reason === "kept_empty" ? `Seat ${seat} at ${table?.name} is kept empty.` : `${nameOf(guestId)} can’t go there.`;
    return { plan, message: reason, refused: true };
  }
  const swapped = result.assignments.find((item) => item.guestId !== guestId);
  const message = !swapped ? `${nameOf(guestId)} seated at ${table?.name}, seat ${seat}.`
    : swapped.tableId ? `${nameOf(guestId)} and ${nameOf(swapped.guestId)} swapped places.`
    : `${nameOf(guestId)} seated at ${table?.name}, seat ${seat}. ${nameOf(swapped.guestId)} moved to “To be seated”.`;
  return { plan: apply(plan, everyone, result.assignments), message };
}

export function demoUnseat(plan: DemoPlan, reply: DemoReply, guestId: string): DemoResult {
  const everyone = demoPlanGuests(plan, reply);
  const name = everyone.find((guest) => guest.id === guestId)?.name ?? "";
  return { plan: apply(plan, everyone, unseat(everyone, guestId)), message: `${name} moved to “To be seated”.` };
}

/** The summary line: "6 of 25 guests seated · 21 empty seats · 3 tables". */
export function planDemoSummary(guests: PlanGuest[]) {
  const summary = planSummary(demoTables, guests);
  return { ...summary, empty: summary.free + summary.keptEmpty };
}
