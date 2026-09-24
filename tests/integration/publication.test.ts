import { afterAll, beforeAll, expect, it } from "vitest";
import sharp from "sharp";
import { localSupabase } from "../helpers/local-supabase";
import { reservedSlugs } from "../../src/features/workspace/publication-validation";
import { themes } from "../../src/features/weddings/themes";

const local = localSupabase();
const owners = [local.anonymous(), local.anonymous()];
const ids: string[] = [];
const weddings: string[] = [];
const files: string[] = [];
const slug = `wedding-${crypto.randomUUID()}`;
const base = { first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" };
beforeAll(async () => {
  for (const owner of owners) {
    const email = `publish-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const { data, error } = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error("Cannot create test owner");
    ids.push(data.user.id);
    expect((await owner.auth.signInWithPassword({ email, password })).error).toBeNull();
    const row = await owner.from("weddings").insert({ ...base, owner_id: data.user.id }).select("id").single();
    expect(row.error).toBeNull();
    weddings.push(row.data!.id);
    expect((await local.grantEntitlement(row.data!.id, data.user.id)).error).toBeNull();
  }
});
afterAll(async () => {
  await local.admin.storage.from("wedding-photos").remove(files);
  for (const id of ids) await local.admin.auth.admin.deleteUser(id);
});

it("enforces reserved slugs, concurrent uniqueness and permanent URL locking", async () => {
  for (const invalid of [...reservedSlugs, "a", "UPPER", "two--hyphens", "x/y", "a".repeat(64)]) {
    expect((await owners[0].from("weddings").update({ slug: invalid }).eq("id", weddings[0])).error).not.toBeNull();
  }
  const results = await Promise.all(owners.map((owner, i) => owner.from("weddings").update({ slug, published: true }).eq("id", weddings[i])));
  expect(results.filter((r) => !r.error)).toHaveLength(1);
  expect(results.find((r) => r.error)?.error?.code).toBe("23505");
  const winner = results.findIndex((r) => !r.error);
  expect((await owners[winner].from("weddings").update({ published: false, first_published_at: null }).eq("id", weddings[winner])).error).toBeNull();
  expect((await owners[winner].from("weddings").update({ slug: `${slug}-new` }).eq("id", weddings[winner])).error?.code).toBe("23514");
  expect((await local.anonymous().rpc("published_wedding", { requested_slug: slug })).data).toEqual([]);
});

it("isolates storage and exposes only the current published photo with no signed URLs", async () => {
  const photo = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).webp().toBuffer();
  const path = `${weddings[0]}/${crypto.randomUUID()}.webp`;
  files.push(path);
  const bucket = owners[0].storage.from("wedding-photos");
  const other = owners[1].storage.from("wedding-photos");
  const anon = local.anonymous().storage.from("wedding-photos");
  expect((await other.upload(path, photo, { contentType: "image/webp" })).error).not.toBeNull();
  expect((await bucket.upload(path, photo, { contentType: "image/webp", cacheControl: "0" })).error).toBeNull();
  expect((await bucket.download(path)).error).toBeNull();
  expect((await other.download(path)).error).not.toBeNull();
  expect((await anon.download(path)).error).not.toBeNull();
  expect((await other.remove([path])).data).toEqual([]);
  expect((await owners[1].from("weddings").update({ photo_path: path }).eq("id", weddings[1])).error).not.toBeNull();
  const ownRow = await owners[0].from("weddings").select("slug").eq("id", weddings[0]).single();
  const ownSlug = ownRow.data!.slug ?? `${slug}-other`;
  expect((await owners[0].from("weddings").update({ photo_path: path, slug: ownSlug, published: true }).eq("id", weddings[0])).error).toBeNull();
  const published = await local.anonymous().rpc("published_wedding", { requested_slug: ownSlug });
  expect(Object.keys(published.data![0]).sort()).toEqual(["first_name", "second_name", "wedding_date", "location", "message", "photo_path", "photo_framing", "theme", "details_enabled", "rsvp_enabled"].sort());
  expect((await anon.download(path)).error).toBeNull();
  expect((await anon.list(weddings[0])).data).toEqual([]);
  for (const reader of [anon, other, bucket]) expect((await reader.createSignedUrl(path, 3600)).error).not.toBeNull();
  const replacement = `${weddings[0]}/${crypto.randomUUID()}.webp`;
  files.push(replacement);
  expect((await bucket.upload(replacement, photo, { contentType: "image/webp", cacheControl: "0" })).error).toBeNull();
  expect((await owners[0].from("weddings").update({ photo_path: replacement }).eq("id", weddings[0])).error).toBeNull();
  expect((await anon.download(path)).error).not.toBeNull();
  expect((await anon.download(replacement)).error).toBeNull();
  expect((await owners[0].from("weddings").update({ published: false }).eq("id", weddings[0])).error).toBeNull();
  expect((await anon.download(replacement)).error).not.toBeNull();
  expect((await anon.download(path)).error).not.toBeNull();
  expect((await other.download(path)).error).not.toBeNull();
  expect((await bucket.download(path)).error).toBeNull();
  expect((await bucket.remove([path])).error).toBeNull();
  expect((await bucket.download(path)).error).not.toBeNull();
});

it("validates themes and keeps changes isolated without altering wedding content", async () => {
  const owner = owners[0];
  const id = weddings[0];
  const before = await owner.from("weddings").select("*").eq("id", id).single();
  expect(before.data!.theme).toBe("minimal");
  for (const theme of ["unknown", "BOLD", "", null]) {
    expect((await owner.from("weddings").update({ theme }).eq("id", id)).error).not.toBeNull();
  }
  for (const caller of [owners[1], local.anonymous()]) {
    const denied = await caller.from("weddings").update({ theme: "bold" }).eq("id", id).select("id");
    expect(denied.data ?? []).toEqual([]);
  }
  for (const theme of [...themes.slice(1).map(({ id }) => id), "minimal"]) {
    const updated = await owner.from("weddings").update({ theme }).eq("id", id).select("*").single();
    expect(updated.error).toBeNull();
    expect(updated.data).toEqual({ ...before.data, theme, updated_at: updated.data!.updated_at });
  }
});

it("validates, isolates and narrowly publishes per-theme photo framing, then resets it for a new photo", async () => {
  const owner = owners[0];
  const id = weddings[0];
  const framing = {
    minimal: { saveTheDate: { x: 22, y: 78, zoom: 1.25 }, details: { x: 66, y: 35, zoom: 1.5 } },
    romantic: { saveTheDate: { x: 10, y: 90, zoom: 2 } },
    "evening-gold": { details: { x: 30, y: 40, zoom: 1.2 } },
  };
  expect((await owner.from("weddings").update({ photo_framing: framing }).eq("id", id)).error).toBeNull();
  for (const invalid of [
    { minimal: { saveTheDate: { x: -1, y: 50, zoom: 1 } } },
    { minimal: { saveTheDate: { x: 50, y: 50, zoom: 3 } } },
    { minimal: { saveTheDate: { x: 50, y: 50, zoom: 1, rotate: 5 } } },
    { unknown: {} },
    { "evening_gold": {} },
  ]) expect((await owner.from("weddings").update({ photo_framing: invalid }).eq("id", id)).error).not.toBeNull();
  const denied = await owners[1].from("weddings").update({ photo_framing: {} }).eq("id", id).select("id");
  expect(denied.data ?? []).toEqual([]);

  const row = await owner.from("weddings").select("slug").eq("id", id).single();
  const publicSlug = row.data!.slug ?? `${slug}-framing`;
  expect((await owner.from("weddings").update({ slug: publicSlug, published: true, theme: "minimal", details_enabled: true, ceremony_venue: "The Orangery" }).eq("id", id)).error).toBeNull();
  const published = await local.anonymous().rpc("published_wedding", { requested_slug: publicSlug });
  expect(published.data![0].photo_framing).toEqual({ minimal: framing.minimal });
  const publishedDetails = await local.anonymous().rpc("published_wedding_details", { requested_slug: publicSlug });
  expect(publishedDetails.data![0].photo_framing).toEqual({ minimal: framing.minimal });

  expect((await owner.from("weddings").update({ theme: "romantic" }).eq("id", id)).error).toBeNull();
  expect((await local.anonymous().rpc("published_wedding", { requested_slug: publicSlug })).data![0].photo_framing).toEqual({ romantic: framing.romantic });
  expect((await owner.from("weddings").update({ theme: "minimal" }).eq("id", id)).error).toBeNull();
  expect((await local.anonymous().rpc("published_wedding", { requested_slug: publicSlug })).data![0].photo_framing).toEqual({ minimal: framing.minimal });

  const beforeSave = await owner.from("weddings").select("photo_path, photo_framing").eq("id", id).single();
  const changed = { ...framing, bold: { details: { x: 40, y: 45, zoom: 1.1 } } };
  const expectedPhoto = beforeSave.data!.photo_path;
  const firstQuery = owner.from("weddings").update({ photo_framing: changed }).eq("id", id)
    .eq("theme", "minimal").eq("photo_framing", JSON.stringify(beforeSave.data!.photo_framing));
  const firstSave = await (expectedPhoto ? firstQuery.eq("photo_path", expectedPhoto) : firstQuery.is("photo_path", null)).select("id");
  expect(firstSave.error).toBeNull();
  expect(firstSave.data).toHaveLength(1);
  const staleQuery = owner.from("weddings").update({ photo_framing: framing }).eq("id", id)
    .eq("theme", "minimal").eq("photo_framing", JSON.stringify(beforeSave.data!.photo_framing));
  const staleSave = await (expectedPhoto ? staleQuery.eq("photo_path", expectedPhoto) : staleQuery.is("photo_path", null)).select("id");
  expect(staleSave.error).toBeNull();
  expect(staleSave.data).toEqual([]);

  const nextPath = `${id}/${crypto.randomUUID()}.webp`;
  expect((await owner.from("weddings").update({ photo_path: nextPath, photo_framing: framing }).eq("id", id)).error).toBeNull();
  expect((await owner.from("weddings").select("photo_framing").eq("id", id).single()).data!.photo_framing).toEqual({});
});
