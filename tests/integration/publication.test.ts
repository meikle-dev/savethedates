import { afterAll, beforeAll, expect, it } from "vitest";
import sharp from "sharp";
import { localSupabase } from "../helpers/local-supabase";
import { reservedSlugs } from "../../src/features/workspace/publication-validation";

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
  expect(Object.keys(published.data![0]).sort()).toEqual(["first_name", "second_name", "wedding_date", "location", "message", "photo_path", "theme", "details_enabled"].sort());
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
  for (const theme of ["romantic", "bold", "minimal"]) {
    const updated = await owner.from("weddings").update({ theme }).eq("id", id).select("*").single();
    expect(updated.error).toBeNull();
    expect(updated.data).toEqual({ ...before.data, theme, updated_at: updated.data!.updated_at });
  }
});
