import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

// F078: owner-only guest list and table plan, database seat rules and limits.
const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
const anonymous = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
let otherWeddingId = "";

async function signUp(client: typeof owner) {
  const email = `guest-list-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create guest list test user");
  expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  const wedding = await client.from("weddings").insert({ owner_id: created.data.user.id, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" }).select("id").single();
  expect(wedding.error).toBeNull();
  return { userId: created.data.user.id, weddingId: wedding.data!.id as string };
}

async function addTable(values: Record<string, unknown> = {}, client = owner, wedding = weddingId) {
  const result = await client.from("wedding_tables").insert({ wedding_id: wedding, name: `Table ${crypto.randomUUID().slice(0, 6)}`, shape: "round", seats: 4, ...values }).select("id").single();
  expect(result.error).toBeNull();
  return result.data!.id as string;
}

async function addGuests(names: string[], client = owner, wedding = weddingId) {
  const result = await client.from("wedding_guests").insert(names.map((name) => ({ wedding_id: wedding, name }))).select("id");
  expect(result.error).toBeNull();
  return result.data!.map((row) => row.id as string);
}

const seat = (guest_id: string, table_id: string | null, seatNumber: number | null) => ({ guest_id, table_id, seat: seatNumber });
const place = (assignments: ReturnType<typeof seat>[], client = owner) => client.rpc("set_guest_seats", { assignments });
async function seatsOf(ids: string[]) {
  const { data } = await owner.from("wedding_guests").select("id, table_id, seat").in("id", ids);
  return Object.fromEntries((data ?? []).map((row) => [row.id, [row.table_id, row.seat]]));
}

beforeAll(async () => {
  ({ userId: ownerId, weddingId } = await signUp(owner));
  ({ userId: otherId, weddingId: otherWeddingId } = await signUp(other));
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

describe("guest list", () => {
  it("validates names and groups in the database", async () => {
    const insert = (values: Record<string, unknown>) => owner.from("wedding_guests").insert({ wedding_id: weddingId, name: "Valid", ...values });
    for (const values of [{ name: "" }, { name: " Padded" }, { name: "x".repeat(121) }, { name: "Tab\there" }, { group_name: "g".repeat(61) }, { group_name: " x" }, { status: "maybe" }]) {
      expect((await insert(values)).error, JSON.stringify(values)).not.toBeNull();
    }
    expect((await insert({ name: "Zoë Ó Briain", group_name: "Bride’s family", status: "attending" })).error).toBeNull();
  });

  it("is private to its owner", async () => {
    const [id] = await addGuests(["Private Guest"]);
    expect((await other.from("wedding_guests").select("id").eq("id", id)).data).toEqual([]);
    expect((await anonymous.from("wedding_guests").select("id").eq("id", id)).data ?? []).toEqual([]);
    expect((await other.from("wedding_guests").update({ name: "Taken" }).eq("id", id).select("id")).data).toEqual([]);
    expect((await other.from("wedding_guests").delete().eq("id", id).select("id")).data).toEqual([]);
    // Nobody can add guests to someone else's wedding, or move a guest to another wedding.
    expect((await other.from("wedding_guests").insert({ wedding_id: weddingId, name: "Intruder" })).error).not.toBeNull();
    expect((await anonymous.from("wedding_guests").insert({ wedding_id: weddingId, name: "Intruder" })).error).not.toBeNull();
    expect((await owner.from("wedding_guests").update({ wedding_id: otherWeddingId }).eq("id", id)).error).not.toBeNull();
    // Another owner can't seat or unseat it through the seating function either.
    expect((await place([seat(id, null, null)], other)).error?.message).toBe("unknown_guest");
    expect((await anonymous.rpc("set_guest_seats", { assignments: [seat(id, null, null)] })).error).not.toBeNull();
    expect((await owner.from("wedding_guests").select("name").eq("id", id).single()).data?.name).toBe("Private Guest");
  });

  it("allows at most 1,000 guests per wedding", async () => {
    const { count } = await owner.from("wedding_guests").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
    const room = 1000 - (count ?? 0);
    const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ wedding_id: weddingId, name: `Bulk ${i}` }));
    const over = await owner.from("wedding_guests").insert(rows(room + 1));
    expect(over.error?.message).toBe("guest_limit");
    expect((await owner.from("wedding_guests").insert(rows(room))).error).toBeNull();
    expect((await owner.from("wedding_guests").insert(rows(1))).error?.message).toBe("guest_limit");
    expect((await owner.from("wedding_guests").delete().like("name", "Bulk %")).error).toBeNull();
  });
});

describe("tables", () => {
  it("are private, validated and uniquely named", async () => {
    const id = await addTable({ name: "Top table", shape: "top", seats: 6 });
    expect((await other.from("wedding_tables").select("id").eq("id", id)).data).toEqual([]);
    expect((await anonymous.from("wedding_tables").select("id").eq("id", id)).data ?? []).toEqual([]);
    expect((await other.from("wedding_tables").update({ seats: 2 }).eq("id", id).select("id")).data).toEqual([]);
    expect((await other.from("wedding_tables").delete().eq("id", id).select("id")).data).toEqual([]);
    expect((await other.from("wedding_tables").insert({ wedding_id: weddingId, name: "Intruder", shape: "round", seats: 4 })).error).not.toBeNull();
    const insert = (values: Record<string, unknown>) => owner.from("wedding_tables").insert({ wedding_id: weddingId, name: `T ${crypto.randomUUID().slice(0, 6)}`, shape: "round", seats: 4, ...values });
    for (const values of [{ name: "top TABLE" }, { name: "" }, { shape: "oval" }, { seats: 0 }, { seats: 31 }, { kept_empty: [5] }, { kept_empty: [1, 1] }, { kept_empty: [0] }]) {
      expect((await insert(values)).error, JSON.stringify(values)).not.toBeNull();
    }
    expect((await insert({ kept_empty: [2, 4] })).error).toBeNull();
  });

  it("allows at most 100 tables per wedding", async () => {
    const { count } = await owner.from("wedding_tables").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
    const rows = (n: number) => Array.from({ length: n }, () => ({ wedding_id: weddingId, name: `Many ${crypto.randomUUID()}`.slice(0, 40), shape: "round", seats: 8 }));
    expect((await owner.from("wedding_tables").insert(rows(100 - (count ?? 0) + 1))).error?.message).toBe("table_limit");
    expect((await owner.from("wedding_tables").insert(rows(100 - (count ?? 0)))).error).toBeNull();
    expect((await owner.from("wedding_tables").delete().like("name", "Many %")).error).toBeNull();
  });
});

describe("seating", () => {
  it("seats, swaps and unseats atomically through set_guest_seats", async () => {
    const table = await addTable({ seats: 4 });
    const [a, b, c] = await addGuests(["Ann", "Ben", "Cat"]);
    expect((await place([seat(a, table, 1), seat(b, table, 2)])).error).toBeNull();
    // Swap in one call: valid because the unique seat constraint is checked at the end.
    expect((await place([seat(a, table, 2), seat(b, table, 1)])).error).toBeNull();
    expect(await seatsOf([a, b])).toEqual({ [a]: [table, 2], [b]: [table, 1] });
    // One bad assignment rejects the whole call.
    const unknown = crypto.randomUUID();
    expect((await place([seat(c, table, 3), seat(unknown, table, 4)])).error?.message).toBe("unknown_guest");
    expect((await place([seat(c, table, 3), seat(c, table, 4)])).error?.message).toBe("invalid_assignments");
    expect(await seatsOf([c])).toEqual({ [c]: [null, null] });
    expect((await place([seat(c, table, 1)])).error).not.toBeNull(); // taken
    expect((await place([seat(c, table, 5)])).error).not.toBeNull(); // no such seat
    expect((await place([seat(c, table, null)])).error).not.toBeNull(); // table without a seat
    expect((await place([seat(a, null, null)])).error).toBeNull();
    expect(await seatsOf([a])).toEqual({ [a]: [null, null] });
  });

  it("never seats a guest at another wedding's table", async () => {
    const theirTable = await addTable({}, other, otherWeddingId);
    const [guest] = await addGuests(["Cross"]);
    expect((await place([seat(guest, theirTable, 1)])).error).not.toBeNull();
    expect((await owner.from("wedding_guests").update({ table_id: theirTable, seat: 1 }).eq("id", guest)).error).not.toBeNull();
    expect(await seatsOf([guest])).toEqual({ [guest]: [null, null] });
  });

  it("keeps kept-empty seats and table sizes consistent with seated guests", async () => {
    const table = await addTable({ seats: 4, kept_empty: [3] });
    const [a, b] = await addGuests(["Dee", "Eve"]);
    expect((await place([seat(a, table, 3)])).error?.message).toBe("seat_unavailable");
    expect((await place([seat(a, table, 4), seat(b, table, 2)])).error).toBeNull();
    // A table can't shrink past, or keep empty, a seat someone is in.
    expect((await owner.from("wedding_tables").update({ seats: 3 }).eq("id", table)).error).not.toBeNull();
    expect((await owner.from("wedding_tables").update({ kept_empty: [2] }).eq("id", table)).error?.message).toBe("seat_unavailable");
    expect((await owner.from("wedding_tables").update({ kept_empty: [] }).eq("id", table)).error).toBeNull();
    expect((await place([seat(a, table, 1)])).error).toBeNull();
    expect((await owner.from("wedding_tables").update({ seats: 2 }).eq("id", table)).error).toBeNull();
  });

  it("frees the seat of a guest who isn't attending, and of guests at a deleted table", async () => {
    const table = await addTable({ seats: 4 });
    const [a, b] = await addGuests(["Fay", "Gus"]);
    expect((await place([seat(a, table, 1), seat(b, table, 2)])).error).toBeNull();
    expect((await owner.from("wedding_guests").update({ status: "declined" }).eq("id", a)).error).toBeNull();
    expect(await seatsOf([a])).toEqual({ [a]: [null, null] });
    expect((await owner.from("wedding_tables").delete().eq("id", table)).error).toBeNull();
    const { data } = await owner.from("wedding_guests").select("name, table_id, seat, status").in("id", [a, b]).order("name");
    expect(data).toEqual([{ name: "Fay", table_id: null, seat: null, status: "declined" }, { name: "Gus", table_id: null, seat: null, status: "awaiting" }]);
  });
});

describe("bulk changes", () => {
  it("removes up to 1,000 guests in one call, only the caller's", async () => {
    const ids = (await owner.from("wedding_guests").insert(Array.from({ length: 1000 - ((await owner.from("wedding_guests").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId)).count ?? 0) }, (_, i) => ({ wedding_id: weddingId, name: `Undo ${i}` }))).select("id")).data!.map((row) => row.id as string);
    expect(ids.length).toBeGreaterThan(900);
    const [theirs] = await addGuests(["Theirs"], other, otherWeddingId);
    expect((await other.rpc("delete_guests", { guest_ids: ids })).data).toBe(0);
    expect((await owner.rpc("delete_guests", { guest_ids: [...ids, theirs] })).data).toBe(ids.length);
    expect((await other.from("wedding_guests").select("id").eq("id", theirs)).data).toHaveLength(1);
    expect((await owner.rpc("delete_guests", { guest_ids: [] })).error?.message).toBe("invalid_guests");
    expect((await anonymous.rpc("delete_guests", { guest_ids: [theirs] })).error).not.toBeNull();
  });

  it("saves a table edit and its seat moves together, or not at all", async () => {
    const table = await addTable({ name: "Resize me", seats: 4 });
    await addTable({ name: "Taken name", seats: 4 });
    const [a, b] = await addGuests(["Kim", "Lou"]);
    expect((await place([seat(a, table, 3), seat(b, table, 4)])).error).toBeNull();
    const edit = (name: string, seats: number, keptEmpty: number[], assignments: ReturnType<typeof seat>[]) =>
      owner.rpc("save_table", { requested_table_id: table, requested_name: name, requested_shape: "round", requested_seats: seats, requested_kept_empty: keptEmpty, assignments });
    // A duplicate name refuses the edit, and nobody moves.
    expect((await edit("taken NAME", 2, [], [seat(a, table, 1), seat(b, table, 2)])).error).not.toBeNull();
    expect(await seatsOf([a, b])).toEqual({ [a]: [table, 3], [b]: [table, 4] });
    // Shrinking, with the moves it needs, in one call; also releasing and keeping seats at once.
    expect((await edit("Resized", 2, [], [seat(a, table, 1), seat(b, table, 2)])).error).toBeNull();
    expect(await seatsOf([a, b])).toEqual({ [a]: [table, 1], [b]: [table, 2] });
    expect((await edit("Resized", 3, [1], [seat(a, table, 3)])).error).toBeNull();
    expect((await edit("Resized", 3, [], [seat(a, table, 1)])).error).toBeNull();
    // Without the moves, the edit is refused at commit.
    expect((await edit("Resized", 1, [], [])).error?.message).toBe("seat_unavailable");
    expect((await other.rpc("save_table", { requested_table_id: table, requested_name: "Mine", requested_shape: "round", requested_seats: 8, requested_kept_empty: [], assignments: [] })).error?.message).toBe("unknown_table");
  });

  it("refuses to seat a guest who isn't attending", async () => {
    const table = await addTable({ seats: 2 });
    const [guest] = await addGuests(["Mo"]);
    expect((await owner.from("wedding_guests").update({ status: "declined" }).eq("id", guest)).error).toBeNull();
    expect((await place([seat(guest, table, 1)])).error?.message).toBe("declined_guest");
  });

  it("updates statuses and adds attending replies in one transaction", async () => {
    const [a, b] = await addGuests(["Ned", "Oli"]);
    const apply = (client: typeof owner, wedding: string) => client.rpc("apply_reply_sync", { requested_wedding_id: wedding, attending_ids: [a], declined_ids: [b], new_names: ["Pat New"] });
    expect((await apply(other, weddingId)).error).not.toBeNull(); // can't insert into someone else's wedding
    expect((await owner.from("wedding_guests").select("status").in("id", [a, b])).data).toEqual([{ status: "awaiting" }, { status: "awaiting" }]);
    expect((await apply(owner, weddingId)).error).toBeNull();
    const { data } = await owner.from("wedding_guests").select("name, status").in("name", ["Ned", "Oli", "Pat New"]).order("name");
    expect(data).toEqual([{ name: "Ned", status: "attending" }, { name: "Oli", status: "declined" }, { name: "Pat New", status: "attending" }]);
  });

  it("are deleted with the wedding", async () => {
    const client = local.anonymous();
    const { userId, weddingId: wedding } = await signUp(client);
    await addTable({}, client, wedding);
    await addGuests(["Gone"], client, wedding);
    expect((await local.admin.auth.admin.deleteUser(userId)).error).toBeNull();
    expect((await local.admin.from("wedding_guests").select("id").eq("wedding_id", wedding)).data).toEqual([]);
    expect((await local.admin.from("wedding_tables").select("id").eq("wedding_id", wedding)).data).toEqual([]);
  });
});
