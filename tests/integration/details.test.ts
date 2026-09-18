import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
const slug = `details-${crypto.randomUUID()}`;

beforeAll(async () => {
  for (const [client, assign] of [[owner, (id: string) => { ownerId = id; }], [other, (id: string) => { otherId = id; }]] as const) {
    const email = `details-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Cannot create details test owner");
    assign(created.data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  const inserted = await owner.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug }).select("id").single();
  expect(inserted.error).toBeNull();
  weddingId = inserted.data!.id;
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

it("validates structured details and exposes only enabled details for published weddings", async () => {
  expect((await owner.from("weddings").update({ details_enabled: true }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ ceremony_venue: " Padded " }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ ceremony_url: "javascript:alert(1)" }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ ceremony_url: "http://?" }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ ceremony_url: "http://a.example:99999" }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ faqs: [{ question: "Parking?", answer: "" }] }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ faqs: [{ question: 1, answer: true }] }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ faqs: Array.from({ length: 6 }, () => ({ question: "Question", answer: "Answer" })) }).eq("id", weddingId)).error).not.toBeNull();

  const details = {
    ceremony_time: "1:30pm",
    ceremony_venue: "The Old Hall",
    ceremony_address: "1 High Street, Bath",
    ceremony_url: "https://example.test/ceremony",
    travel: "A shuttle leaves the station at 12:45pm.",
    travel_url: "https://example.test/travel",
    dress_code: "Summer formal",
    faqs: [{ question: "Can children attend?", answer: "Please check your invitation." }],
    details_enabled: true,
    published: true,
  };
  expect((await owner.from("weddings").update(details).eq("id", weddingId)).error).toBeNull();
  for (const caller of [other, local.anonymous()]) {
    const denied = await caller.from("weddings").update({ dress_code: "Changed" }).eq("id", weddingId).select("id");
    expect(denied.data ?? []).toEqual([]);
  }
  const landing = await local.anonymous().rpc("published_wedding", { requested_slug: slug });
  expect(landing.data![0].details_enabled).toBe(true);
  expect(landing.data![0]).not.toHaveProperty("travel");
  const published = await local.anonymous().rpc("published_wedding_details", { requested_slug: slug });
  expect(published.error).toBeNull();
  expect(published.data![0]).toMatchObject({ first_name: "Alex", second_name: "Morgan", ceremony_venue: "The Old Hall", travel: details.travel, dress_code: details.dress_code, faqs: details.faqs });
  expect(published.data![0]).not.toHaveProperty("owner_id");

  expect((await owner.from("weddings").update({ details_enabled: false }).eq("id", weddingId)).error).toBeNull();
  expect((await local.anonymous().rpc("published_wedding_details", { requested_slug: slug })).data).toEqual([]);
  const saved = await owner.from("weddings").select("travel, faqs").eq("id", weddingId).single();
  expect(saved.data).toEqual({ travel: details.travel, faqs: details.faqs });
  expect((await owner.from("weddings").update({ details_enabled: true, published: false }).eq("id", weddingId)).error).toBeNull();
  expect((await local.anonymous().rpc("published_wedding_details", { requested_slug: slug })).data).toEqual([]);
});
