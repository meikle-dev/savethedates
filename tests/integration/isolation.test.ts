import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const ownerA = local.anonymous();
const ownerB = local.anonymous();
const ids: string[] = [];
const base = { first_name: "Morgan", second_name: "Taylor", wedding_date: "2027-07-17", location: "Bath", message: "See you there." };
let weddingId: string;

beforeAll(async () => {
  for (const client of [ownerA, ownerB]) {
    const email = `isolation-${crypto.randomUUID()}@example.test`;
    const password = `Test-${crypto.randomUUID()}`;
    const { data, error } = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error("Unable to create local test user.");
    ids.push(data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  const { data, error } = await ownerA.from("weddings").insert({ ...base, owner_id: ids[0] }).select("id").single();
  expect(error).toBeNull();
  weddingId = data!.id;
});

afterAll(async () => {
  for (const id of ids) await local.admin.auth.admin.deleteUser(id);
});

describe("private wedding RLS", () => {
  it("lets an owner read and update their draft", async () => {
    const result = await ownerA.from("weddings").update({ location: "Bristol" }).eq("id", weddingId).select();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].location).toBe("Bristol");
  });
  it("hides a draft from another authenticated owner and denies changes", async () => {
    expect((await ownerB.from("weddings").select().eq("id", weddingId)).data).toEqual([]);
    expect((await ownerB.from("weddings").update({ location: "Stolen" }).eq("id", weddingId).select()).data).toEqual([]);
    expect((await ownerB.from("weddings").insert({ ...base, owner_id: ids[0] })).error).not.toBeNull();
    expect((await ownerB.from("weddings").upsert({ ...base, owner_id: ids[0] }, { onConflict: "owner_id" })).error).not.toBeNull();
    expect((await ownerA.from("weddings").update({ owner_id: ids[1] }).eq("id", weddingId)).error).not.toBeNull();
  });
  it("denies anonymous reads, inserts, and updates", async () => {
    const anon = local.anonymous();
    expect((await anon.from("weddings").select()).error).not.toBeNull();
    expect((await anon.from("weddings").insert({ ...base, owner_id: ids[0] })).error).not.toBeNull();
    expect((await anon.from("weddings").update({ message: "Changed" }).eq("id", weddingId)).error).not.toBeNull();
  });
  it("enforces one wedding per owner and database validation", async () => {
    expect((await ownerA.from("weddings").insert({ ...base, owner_id: ids[0] })).error?.code).toBe("23505");
    for (const invalid of [{ first_name: " " }, { second_name: "x".repeat(81) }, { location: "" }, { wedding_date: "2027-02-30" }, { message: "x".repeat(501) }]) {
      expect((await ownerA.from("weddings").update(invalid).eq("id", weddingId)).error).not.toBeNull();
    }
  });
});
