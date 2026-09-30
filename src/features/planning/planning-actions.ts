"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorReason, identify, log, withLogging, type LogRoute } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { denyWorkspace, WorkspaceAccessError } from "@/features/workspace/workspace-access";
import { cleanText, guestStatuses, maxGroupLength, maxGuestNameLength, maxGuests } from "./guest-import";
import { guestColumns, tableColumns, toGuest, toTable, type GuestRow, type TableRow } from "./planning-data";
import { replySync, type SyncPlan } from "./reply-sync";
import {
  maxTableNameLength,
  maxTables,
  maxTableSeats,
  minTableSeats,
  nextTableName,
  reseatForResize,
  tableShapes,
  type Assignment,
  type PlanGuest,
} from "./seating";

export type PlanningResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };
type Section = "guest_list" | "table_plan";

const routes: Record<Section, LogRoute> = { guest_list: "/dashboard/guest-list", table_plan: "/dashboard/table-plan" };
const refreshNeeded = "Refresh the page to see your latest plan, then try again.";

/** Owner-facing messages for the database's own refusals; anything else is a fault. */
const refusals: Record<string, string> = {
  guest_limit: `Your guest list can hold up to ${maxGuests.toLocaleString("en-GB")} guests.`,
  table_limit: `You can have up to ${maxTables} tables.`,
  seat_unavailable: `That seat isn’t available any more. ${refreshNeeded}`,
  unknown_guest: `Some of those guests are no longer on your list. ${refreshNeeded}`,
  unknown_table: `That table has been removed. ${refreshNeeded}`,
  declined_guest: `Guests who aren’t attending can’t be seated. ${refreshNeeded}`,
  wedding_tables_name_key: "You already have a table with that name.",
  wedding_guests_seat_key: `Someone is already in that seat. ${refreshNeeded}`,
};

class Refused extends Error {}

function refusalMessage(error: { message?: string; details?: string; code?: string } | null) {
  if (!error) return null;
  const key = error.code === "23505" ? Object.keys(refusals).find((name) => `${error.message} ${error.details}`.includes(name)) : error.message;
  return key && refusals[key] ? refusals[key] : null;
}

async function ownerWedding() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) denyWorkspace("no_session", "Your session has ended. Sign in again, then retry.");
  identify({ ownerId: user.id });
  const { data, error } = await client.from("weddings").select("id").eq("owner_id", user.id).single();
  if (error || !data) denyWorkspace("no_wedding", "Save your wedding details first, then retry.");
  identify({ weddingId: data.id as string });
  return { client, weddingId: data.id as string };
}

type Owner = Awaited<ReturnType<typeof ownerWedding>>;

/** Runs one owner change: invalid input and database refusals come back as a message; faults are logged. */
async function run<S extends z.ZodType, T extends object>(section: Section, input: unknown, schema: S, work: (owner: Owner, data: z.infer<S>) => Promise<T>): Promise<PlanningResult<T>> {
  return withLogging("workspace.save", routes[section], async () => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
    try {
      const result = await work(await ownerWedding(), parsed.data);
      // Other sections and back/forward navigation must not show a plan from before this change.
      revalidatePath("/dashboard", "layout");
      log.info("workspace.save.succeeded", { section });
      return { ok: true, ...result };
    } catch (error) {
      if (error instanceof WorkspaceAccessError) return { ok: false, message: error.message };
      if (error instanceof Refused) {
        log.warn("workspace.save.rejected", { section, reason: "refused" });
        return { ok: false, message: error.message };
      }
      log.error("workspace.save.failed", { section, reason: errorReason(error) });
      return { ok: false, message: "We couldn’t save that change. Check your connection and try again." };
    }
  });
}

/** Throws a Refused (shown to the owner) for known database refusals, and the error itself otherwise. */
function check<T>(result: { data: T; error: { message?: string; details?: string; code?: string } | null }): NonNullable<T> {
  if (result.error) {
    const message = refusalMessage(result.error);
    throw message ? new Refused(message) : result.error;
  }
  return result.data as NonNullable<T>;
}

const codePoints = (value: string) => Array.from(value).length;
const text = (label: string, max: number, required: boolean) => z.string().max(max * 4).transform(cleanText).refine((value) => !required || value.length > 0, `Enter ${label}.`)
  .refine((value) => codePoints(value) <= max, `${label[0].toUpperCase()}${label.slice(1)} can be up to ${max} characters.`);
const id = z.uuid();
const guestInput = z.object({ name: text("a name", maxGuestNameLength, true), group: text("the group", maxGroupLength, false), status: z.enum(guestStatuses) });
const guestRow = (weddingId: string, guest: z.infer<typeof guestInput>) => ({ wedding_id: weddingId, name: guest.name, group_name: guest.group, status: guest.status });

// ---- Guest list ----

export async function addGuest(input: { name: string; group: string; status: string }) {
  return run("guest_list", input, guestInput, async ({ client, weddingId }, guest) => {
    const row = check(await client.from("wedding_guests").insert(guestRow(weddingId, guest)).select(guestColumns).single());
    return { guest: toGuest(row as GuestRow) };
  });
}

export async function updateGuest(input: { id: string; name: string; group: string; status: string }) {
  const schema = guestInput.extend({ id });
  return run("guest_list", input, schema, async ({ client }, guest) => {
    const row = check(await client.from("wedding_guests").update({ name: guest.name, group_name: guest.group, status: guest.status }).eq("id", guest.id).select(guestColumns).maybeSingle());
    if (!row) throw new Refused(`That guest is no longer on your list. ${refreshNeeded}`);
    return { guest: toGuest(row as GuestRow) };
  });
}

export async function removeGuests(ids: string[]) {
  const schema = z.array(id).min(1).max(maxGuests);
  return run("guest_list", ids, schema, async ({ client }, remove) => {
    // The ids travel in the request body: an "in" filter in the URL fails past a few hundred ids.
    check(await client.rpc("delete_guests", { guest_ids: remove }));
    // RLS limits the delete to the owner's guests, so afterwards none of these ids is on their list.
    return { removed: remove };
  });
}

export async function clearGuestList() {
  return run("guest_list", null, z.null(), async ({ client, weddingId }) => {
    check(await client.from("wedding_guests").delete().eq("wedding_id", weddingId));
    return {};
  });
}

/** F078: the browser parsed and previewed the import; every guest is validated again here and by the database. */
export async function importGuests(guests: { name: string; group: string; status: string }[]) {
  const schema = z.array(guestInput).min(1, "There’s nobody to add.").max(maxGuests, `You can import up to ${maxGuests.toLocaleString("en-GB")} guests at once.`);
  return run("guest_list", guests, schema, async ({ client, weddingId }, list) => {
    const rows = check(await client.from("wedding_guests").insert(list.map((guest) => guestRow(weddingId, guest))).select(guestColumns));
    return { guests: (rows as GuestRow[]).map(toGuest) };
  });
}

async function syncPlan({ client, weddingId }: Owner) {
  const [guests, replies] = await Promise.all([
    client.from("wedding_guests").select("id, name, status").eq("wedding_id", weddingId).range(0, maxGuests - 1),
    client.from("shared_rsvp_responses").select("responding_name, attending, responded_at").eq("wedding_id", weddingId).order("responded_at").range(0, 4999),
  ]);
  const guestRows = check(guests) as { id: string; name: string; status: PlanGuest["status"] }[];
  const replyRows = check(replies) as { responding_name: string; attending: boolean; responded_at: string }[];
  return { plan: replySync(guestRows, replyRows.map((reply) => ({ name: reply.responding_name, attending: reply.attending, respondedAt: reply.responded_at }))), replies: replyRows.length, guests: guestRows.length };
}

export type SyncPreview = Omit<SyncPlan, "attending" | "declined"> & { attending: number; declined: number; replies: number; room: number };

/** What "Update from RSVP replies" would do, worked out from the saved replies, not from anything the browser sends. */
export async function previewReplySync() {
  return run("guest_list", null, z.null(), async (owner) => {
    const { plan, replies, guests } = await syncPlan(owner);
    const preview: SyncPreview = { ...plan, attending: plan.attending.length, declined: plan.declined.length, replies, room: maxGuests - guests };
    return { preview };
  });
}

export async function applyReplySync(options: { add: boolean }) {
  const schema = z.object({ add: z.boolean() });
  return run("guest_list", options, schema, async (owner, { add }) => {
    const { client, weddingId } = owner;
    const { plan, guests: count } = await syncPlan(owner);
    const names = add ? plan.add.filter((name) => codePoints(name) <= maxGuestNameLength) : [];
    if (names.length > maxGuests - count) throw new Refused(refusals.guest_limit);
    // One transaction, with the ids in the request body.
    check(await client.rpc("apply_reply_sync", { requested_wedding_id: weddingId, attending_ids: plan.attending, declined_ids: plan.declined, new_names: names }));
    const guests = check(await client.from("wedding_guests").select(guestColumns).eq("wedding_id", weddingId).order("created_at").order("id").range(0, maxGuests - 1));
    return { guests: (guests as GuestRow[]).map(toGuest), changed: { attending: plan.attending.length, declined: plan.declined.length, added: names.length } };
  });
}

// ---- Tables and seats ----

const tableName = z.string().max(maxTableNameLength * 4).transform(cleanText).refine((value) => value.length > 0, "Enter a table name.")
  .refine((value) => codePoints(value) <= maxTableNameLength, `A table name can be up to ${maxTableNameLength} characters.`);
const seatCount = z.number().int().min(minTableSeats, "A table needs at least one seat.").max(maxTableSeats, `A table can have up to ${maxTableSeats} seats.`);
const newTables = z.object({ shape: z.enum(tableShapes), seats: seatCount, count: z.number().int().min(1).max(50, "Add up to 50 tables at a time."), name: tableName.optional() });

export async function addTables(input: { shape: string; seats: number; count: number; name?: string }) {
  return run("table_plan", input, newTables, async ({ client, weddingId }, table) => {
    const existing = check(await client.from("wedding_tables").select("name, position").eq("wedding_id", weddingId)) as { name: string; position: number }[];
    const positions = existing.map((row) => row.position);
    const [first, last] = [Math.min(0, ...positions), Math.max(0, ...positions)];
    const taken: string[] = [];
    const rows = Array.from({ length: table.count }, (_, index) => {
      const name = table.count === 1 && table.name ? table.name : nextTableName(existing, table.shape, taken);
      taken.push(name);
      // A top table is listed first; others follow the existing tables.
      return { wedding_id: weddingId, name, shape: table.shape, seats: table.seats, position: table.shape === "top" ? first - table.count + index : last + 1 + index };
    });
    const saved = check(await client.from("wedding_tables").insert(rows).select(tableColumns));
    return { tables: (saved as TableRow[]).map(toTable) };
  });
}

const tableChange = z.object({ id, name: tableName, shape: z.enum(tableShapes), seats: seatCount, keptEmpty: z.array(z.number().int().min(1).max(maxTableSeats)).max(maxTableSeats) });

/** Renames, reshapes or resizes a table, or changes its kept-empty seats. Guests keep their seats where they still
 * exist; the rest move to free seats, and only those who no longer fit return to "To be seated". */
export async function updateTable(input: z.input<typeof tableChange>) {
  return run("table_plan", input, tableChange, async ({ client }, change) => {
    const current = check(await client.from("wedding_tables").select(tableColumns).eq("id", change.id).maybeSingle());
    if (!current) throw new Refused(`That table has been removed. ${refreshNeeded}`);
    const keptEmpty = [...new Set(change.keptEmpty)].filter((seat) => seat <= change.seats).sort((a, b) => a - b);
    const seated = check(await client.from("wedding_guests").select(guestColumns).eq("table_id", change.id)) as GuestRow[];
    const { assignments, unseated } = reseatForResize(toTable(current as TableRow), seated.map(toGuest), change.seats, keptEmpty);
    // The table and its moves change together, so a refused edit (a duplicate name, say) moves nobody.
    check(await client.rpc("save_table", {
      requested_table_id: change.id, requested_name: change.name, requested_shape: change.shape, requested_seats: change.seats,
      requested_kept_empty: keptEmpty, assignments: assignments.map(toRpc),
    }));
    return { table: toTable({ ...(current as TableRow), name: change.name, shape: change.shape, seats: change.seats, kept_empty: keptEmpty }), assignments, unseated };
  });
}

export async function deleteTable(tableId: string) {
  return run("table_plan", tableId, id, async ({ client }, remove) => {
    check(await client.from("wedding_tables").delete().eq("id", remove).select("id"));
    return {};
  });
}

const toRpc = (assignment: Assignment) => ({ guest_id: assignment.guestId, table_id: assignment.tableId, seat: assignment.seat });
const assignmentList = z.array(z.object({ guestId: id, tableId: id.nullable(), seat: z.number().int().min(1).max(maxTableSeats).nullable() })
  .refine((assignment) => (assignment.tableId === null) === (assignment.seat === null))).min(1).max(maxGuests);

/** Seats, moves, swaps or unseats guests in one transaction; the database checks every seat. */
export async function saveSeats(assignments: Assignment[]) {
  return run("table_plan", assignments, assignmentList, async ({ client }, list) => {
    check(await client.rpc("set_guest_seats", { assignments: list.map(toRpc) }));
    return {};
  });
}
