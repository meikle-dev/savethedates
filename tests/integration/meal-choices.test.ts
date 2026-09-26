import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

// F068: menu limits, the narrow guest write path, owner-only replies and catering numbers.
const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
const guest = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
let otherWeddingId = "";
let secret = "";
let otherSecret = "";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const menu = {
  starter: [{ id: id(1), label: "Leek and potato soup" }, { id: id(2), label: "Smoked salmon" }],
  main: [{ id: id(3), label: "Roast beef" }, { id: id(4), label: "Hake" }, { id: id(5), label: "Risotto" }],
  dessert: [],
};
const otherMenu = { starter: [{ id: id(11), label: "Pâté" }, { id: id(12), label: "Melon" }], main: [], dessert: [] };
const choose = (starter = menu.starter[0], main = menu.main[1]) => ({ starter, main });
const submit = (values: Record<string, unknown>, requestedSecret = secret) =>
  guest.rpc("submit_shared_rsvp", { requested_secret: requestedSecret, requested_name: `Guest ${crypto.randomUUID().slice(0, 8)}`, requested_attending: true, ...values });

async function setWedding(values: Record<string, unknown>, client = owner, target = weddingId) {
  return client.from("weddings").update(values).eq("id", target).select("id");
}

beforeAll(async () => {
  for (const [client, assign] of [[owner, (value: string) => { ownerId = value; }], [other, (value: string) => { otherId = value; }]] as const) {
    const email = `meals-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Cannot create meal choices test user");
    assign(created.data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  for (const [client, userId, assign] of [[owner, () => ownerId, (w: string, s: string) => { weddingId = w; secret = s; }], [other, () => otherId, (w: string, s: string) => { otherWeddingId = w; otherSecret = s; }]] as const) {
    const wedding = await client.from("weddings").insert({ owner_id: userId(), first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug: `meals-${crypto.randomUUID()}`, rsvp_enabled: true }).select("id, rsvp_share_secret").single();
    expect(wedding.error).toBeNull();
    assign(wedding.data!.id, wedding.data!.rsvp_share_secret);
    expect((await local.grantEntitlement(wedding.data!.id, userId())).error).toBeNull();
    expect((await client.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
  }
  expect((await setWedding({ meal_menu: otherMenu, meal_choices_enabled: true }, other, otherWeddingId)).error).toBeNull();
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

describe("menu", () => {
  it("is off by default and enforces its limits in the database", async () => {
    const saved = await owner.from("weddings").select("meal_choices_enabled, meal_menu").eq("id", weddingId).single();
    expect(saved.data).toEqual({ meal_choices_enabled: false, meal_menu: { starter: [], main: [], dessert: [] } });
    const option = (n: number, label = `Option ${n}`) => ({ id: id(100 + n), label });
    const invalid = [
      { ...menu, starter: [option(1)] }, // one option isn't a choice
      { ...menu, dessert: Array.from({ length: 7 }, (_, n) => option(n)) },
      { ...menu, dessert: [option(1, "Trifle"), option(2, " trifle")] }, // untrimmed
      { ...menu, dessert: [option(1, "Trifle"), option(2, "TRIFLE")] }, // duplicate, case-insensitive
      { ...menu, dessert: [option(1, "x".repeat(81)), option(2)] },
      { ...menu, dessert: [option(1, ""), option(2)] },
      { ...menu, dessert: [{ id: "not-a-uuid", label: "Trifle" }, option(2)] },
      { ...menu, dessert: [{ id: id(1), label: "Trifle" }, option(2)] }, // id already used by a starter
      { ...menu, dessert: [{ ...option(1), extra: true }, option(2)] },
      { starter: [], main: [] },
      { ...menu, drinks: [] },
    ];
    for (const meal_menu of invalid) expect((await setWedding({ meal_menu })).error, JSON.stringify(meal_menu)).not.toBeNull();
    // Switching on needs a filled course; a menu can be prepared while off.
    expect((await setWedding({ meal_choices_enabled: true })).error).not.toBeNull();
    expect((await setWedding({ meal_menu: menu })).error).toBeNull();
    expect((await setWedding({ meal_choices_enabled: true })).error).toBeNull();
  });

  it("can be changed only by its owner", async () => {
    expect((await setWedding({ meal_menu: otherMenu, meal_choices_enabled: false }, other)).data).toEqual([]);
    expect((await setWedding({ meal_menu: otherMenu }, local.anonymous())).data ?? []).toEqual([]);
    expect((await other.from("weddings").select("meal_menu").eq("id", weddingId)).data).toEqual([]);
    expect((await owner.from("weddings").select("meal_menu, meal_choices_enabled").eq("id", weddingId).single()).data).toEqual({ meal_menu: menu, meal_choices_enabled: true });
  });

  it("is projected to guests only while the site is live, RSVP is open and meal choices are on", async () => {
    const project = async (requestedSecret = secret) => (await guest.rpc("guest_rsvp_menu", { requested_secret: requestedSecret })).data;
    expect(await project()).toEqual(menu);
    expect(await project("x".repeat(43))).toBeNull();
    expect(await project(otherSecret)).toEqual(otherMenu);
    expect((await setWedding({ meal_choices_enabled: false })).error).toBeNull();
    expect(await project()).toBeNull();
    expect((await setWedding({ meal_choices_enabled: true, rsvp_enabled: false })).error).toBeNull();
    expect(await project()).toBeNull();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    expect((await setWedding({ rsvp_enabled: true, rsvp_closes_on: yesterday })).error).toBeNull();
    expect(await project()).toBeNull();
    expect((await setWedding({ rsvp_closes_on: null, published: false })).error).toBeNull();
    expect(await project()).toBeNull();
    expect((await setWedding({ published: true })).error).toBeNull();
    expect(await project()).toEqual(menu);
  });
});

describe("guest replies", () => {
  it("stores meal choices from the menu and food preferences", async () => {
    const result = await guest.rpc("submit_shared_rsvp", {
      requested_secret: secret, requested_name: "Sam Jones", requested_attending: true, requested_meals: choose(),
      requested_vegan: true, requested_gluten_free: true, requested_dietary_other: "no mushrooms",
    });
    expect(result.error).toBeNull();
    expect(result.data).toBe("saved");
    const saved = await owner.from("shared_rsvp_responses").select("meal_choices, dietary_vegetarian, dietary_vegan, dietary_gluten_free, dietary_other").eq("wedding_id", weddingId).eq("responding_name", "Sam Jones").single();
    expect(saved.data).toEqual({ meal_choices: choose(), dietary_vegetarian: false, dietary_vegan: true, dietary_gluten_free: true, dietary_other: "no mushrooms" });
  });

  it("rejects every answer that doesn't match the current menu", async () => {
    const rejected = [
      { requested_meals: choose(menu.starter[0], { id: id(99), label: "Hake" }) }, // unknown option
      { requested_meals: choose(menu.starter[0], menu.starter[1]) }, // option from another course
      { requested_meals: choose(otherMenu.starter[0]) }, // option from another wedding
      { requested_meals: choose(menu.starter[0], { id: menu.main[1].id, label: "Pan-roasted hake" }) }, // text the menu no longer has
      { requested_meals: { ...choose(), dessert: menu.starter[0] } }, // a course guests aren't shown
      { requested_meals: { ...choose(), drinks: menu.starter[0] } },
      { requested_meals: choose(menu.starter[0], "Hake" as never) },
    ];
    for (const values of rejected) expect((await submit(values)).data, JSON.stringify(values)).toBe("invalid_meals");
    // A shown course left unanswered, with every other answer valid, is reported separately.
    expect((await submit({ requested_meals: { starter: menu.starter[0] } })).data).toBe("meal_missing");
    expect((await submit({ requested_meals: {} })).data).toBe("meal_missing");
    // A real mismatch takes precedence over a missing course.
    expect((await submit({ requested_meals: { starter: { id: id(99), label: "Soup" } } })).data).toBe("invalid_meals");
    // The previous release's three-argument call still resolves, and a shown course left unanswered is refused.
    expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Old Form", requested_attending: true })).data).toBe("meal_missing");
    expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Old Form", requested_attending: false })).data).toBe("saved");
  });

  it("rejects Other without text, oversized text and any food answer with a No", async () => {
    for (const other of ["", " no mushrooms", "no mushrooms\n", "\tno mushrooms", "\n", "\t", " \t\n", "x".repeat(201)]) {
      expect((await submit({ requested_meals: choose(), requested_dietary_other: other })).data, JSON.stringify(other)).toBe("invalid");
    }
    expect((await submit({ requested_meals: choose(), requested_vegan: null })).data).toBe("invalid");
    expect((await submit({ requested_meals: [] })).data).toBe("invalid");
    for (const food of [{ requested_meals: choose() }, { requested_vegetarian: true }, { requested_dietary_other: "no pork" }]) {
      expect((await submit({ requested_attending: false, ...food })).data, JSON.stringify(food)).toBe("invalid");
    }
    expect((await submit({ requested_attending: false })).data).toBe("saved");
  });

  it("asks only for food preferences while meal choices are off, and refuses meal answers then", async () => {
    expect((await setWedding({ meal_choices_enabled: false })).error).toBeNull();
    expect((await submit({ requested_vegetarian: true })).data).toBe("saved");
    expect((await submit({ requested_meals: choose() })).data).toBe("invalid_meals");
    expect((await setWedding({ meal_choices_enabled: true })).error).toBeNull();
  });

  it("still checks the secret, closure and rotation first", async () => {
    expect((await submit({ requested_meals: choose() }, "x".repeat(43))).data).toBe("unavailable");
    expect((await submit({ requested_meals: choose() }, otherSecret)).data).toBe("invalid_meals");
    expect((await setWedding({ rsvp_enabled: false })).error).toBeNull();
    expect((await submit({ requested_meals: choose() })).data).toBe("closed");
    expect((await setWedding({ rsvp_enabled: true })).error).toBeNull();
  });
});

describe("owner access to replies", () => {
  it("lets only the owner read replies and catering numbers", async () => {
    expect((await guest.from("shared_rsvp_responses").select("dietary_other")).error).not.toBeNull();
    expect((await other.from("shared_rsvp_responses").select("dietary_other").eq("wedding_id", weddingId)).data).toEqual([]);
    expect((await guest.rpc("rsvp_catering_summary", { requested_wedding_id: weddingId })).error).not.toBeNull();
    const denied = await other.rpc("rsvp_catering_summary", { requested_wedding_id: weddingId });
    expect(denied.error).toBeNull();
    expect(denied.data).toEqual({ attending: 0, meals: [], vegetarian: 0, vegan: 0, gluten_free: 0, other: [] });
    const summary = await owner.rpc("rsvp_catering_summary", { requested_wedding_id: weddingId });
    expect(summary.error).toBeNull();
    expect(summary.data).toMatchObject({ attending: 2, vegetarian: 1, vegan: 1, gluten_free: 1, other: [{ name: "Sam Jones", text: "no mushrooms" }] });
    expect(summary.data.meals).toEqual(expect.arrayContaining([
      { course: "starter", id: id(1), label: "Leek and potato soup", count: 1 },
      { course: "main", id: id(4), label: "Hake", count: 1 },
    ]));
  });

  it("never lets owners edit food answers, and clears them when a reply becomes not attending", async () => {
    const reply = await owner.from("shared_rsvp_responses").select("id").eq("wedding_id", weddingId).eq("responding_name", "Sam Jones").single();
    const replyId = reply.data!.id;
    expect((await owner.from("shared_rsvp_responses").update({ dietary_other: "changed" }).eq("id", replyId)).error).not.toBeNull();
    expect((await owner.from("shared_rsvp_responses").update({ meal_choices: {} }).eq("id", replyId)).error).not.toBeNull();
    expect((await other.from("shared_rsvp_responses").update({ attending: false }).eq("id", replyId).select("id")).data).toEqual([]);
    const corrected = await owner.from("shared_rsvp_responses").update({ attending: false }).eq("id", replyId).select("attending, meal_choices, dietary_vegetarian, dietary_vegan, dietary_gluten_free, dietary_other").single();
    expect(corrected.error).toBeNull();
    expect(corrected.data).toEqual({ attending: false, meal_choices: {}, dietary_vegetarian: false, dietary_vegan: false, dietary_gluten_free: false, dietary_other: null });
  });

  it("bounds what a stored reply can hold, whoever writes it", async () => {
    const row = { wedding_id: weddingId, responding_name: "Direct", attending: true };
    expect((await local.admin.from("shared_rsvp_responses").insert({ ...row, attending: false, dietary_vegan: true })).error).not.toBeNull();
    expect((await local.admin.from("shared_rsvp_responses").insert({ ...row, dietary_other: "x".repeat(201) })).error).not.toBeNull();
    for (const other of ["\t", "\n", "no mushrooms\n"]) expect((await local.admin.from("shared_rsvp_responses").insert({ ...row, dietary_other: other })).error, JSON.stringify(other)).not.toBeNull();
    expect((await local.admin.from("shared_rsvp_responses").insert({ ...row, meal_choices: { starter: { id: id(1), label: "x".repeat(81) } } })).error).not.toBeNull();
    expect((await local.admin.from("shared_rsvp_responses").insert({ ...row, meal_choices: { drinks: menu.starter[0] } })).error).not.toBeNull();
  });

  it("keeps the per-wedding capacity for replies with food answers", async () => {
    const current = await local.admin.from("shared_rsvp_responses").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
    const filler = Array.from({ length: 5000 - (current.count ?? 0) }, (_, n) => ({ wedding_id: weddingId, responding_name: `Filler ${n}`, attending: false }));
    expect((await local.admin.from("shared_rsvp_responses").insert(filler)).error).toBeNull();
    expect((await submit({ requested_meals: choose(), requested_dietary_other: "no mushrooms" })).data).toBe("full");
    expect((await local.admin.from("shared_rsvp_responses").delete().like("responding_name", "Filler %").eq("wedding_id", weddingId)).error).toBeNull();
  });
});
