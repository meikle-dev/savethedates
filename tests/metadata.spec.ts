import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();

async function expectGenericHead(page: Page, path: string) {
  expect((await page.goto(path))?.status(), path).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  expect(await page.locator("head").innerHTML()).not.toMatch(/Alex|Morgan|2027-09-18|Bath|\/assets\/share\//);
}

test("guest heads show only published names, date and a static theme card", async ({ page, request, baseURL }) => {
  const created = await local.admin.auth.admin.createUser({ email: `head-${crypto.randomUUID()}@example.test`, password: crypto.randomUUID(), email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create metadata test owner");
  const ownerId = created.data.user.id;
  try {
    const slug = `alex-morgan-${crypto.randomUUID()}`;
    const inserted = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, theme: "romantic", details_enabled: true, ceremony_venue: "A private venue", rsvp_enabled: true }).select("id, rsvp_share_secret").single();
    expect(inserted.error).toBeNull();
    const id = inserted.data!.id;
    const secret = inserted.data!.rsvp_share_secret as string;
    const home = `/${slug}/${secret}`;
    const unknown = `${"x".repeat(43)}`;

    await expectGenericHead(page, home);
    expect((await local.grantEntitlement(id, ownerId)).error).toBeNull();
    await expectGenericHead(page, home);
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", id)).error).toBeNull();

    for (const [suffix, title] of [["", "Save the Date"], ["/details", "Details"], ["/rsvp", "RSVP"]]) {
      const response = await page.goto(`${home}${suffix}`);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`${title} · Alex & Morgan | SaveTheDates`);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Alex & Morgan · Save the Date");
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", "18 September 2027");
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${new URL(baseURL!).origin}/assets/share/romantic.jpg`);
      await expect(page.locator('link[rel="canonical"], meta[property="og:url"]')).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      expect(await page.locator("head").innerHTML()).not.toContain(secret);
      expect(await page.locator("head").innerHTML()).not.toContain("Bath");
      const headers = response!.headers();
      expect(headers["cache-control"]).toMatch(/no-store|no-cache, must-revalidate/);
      expect(headers["referrer-policy"]).toBe("no-referrer");
    }
    const card = await request.get(`${new URL(baseURL!).origin}/assets/share/romantic.jpg`);
    expect(card.status()).toBe(200);
    expect(card.headers()["content-type"]).toContain("image/jpeg");

    expect((await local.admin.from("weddings").update({ details_enabled: false }).eq("id", id)).error).toBeNull();
    await expectGenericHead(page, `${home}/details`);
    expect((await local.admin.from("weddings").update({ details_enabled: true }).eq("id", id)).error).toBeNull();

    await expectGenericHead(page, `/${slug}/${unknown}`);
    await expectGenericHead(page, `${home.slice(0, -43)}${unknown}/details`);
    const replacement = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
    expect((await local.admin.from("weddings").update({ rsvp_share_secret: replacement }).eq("id", id)).error).toBeNull();
    await expectGenericHead(page, home);
    const current = `/${slug}/${replacement}`;
    expect((await page.goto(current))?.status()).toBe(200);
    expect((await local.admin.from("weddings").update({ published: false }).eq("id", id)).error).toBeNull();
    await expectGenericHead(page, current);
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", id)).error).toBeNull();
    expect((await local.admin.from("stripe_payments").update({ expires_at: "2020-01-01T00:00:00Z" }).eq("wedding_id", id)).error).toBeNull();
    await expectGenericHead(page, current);
  } finally {
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});

test("account, fictional examples, previews and 404 have distinct safe titles", async ({ page, request }) => {
  for (const [path, title] of [
    ["/account/sign-in", "Sign in | SaveTheDates"],
    ["/account/sign-up", "Create an account | SaveTheDates"],
    ["/account/recovery", "Reset your password | SaveTheDates"],
    ["/examples/minimal", "Modern Minimal example · Save the Date | SaveTheDates"],
    ["/examples/romantic/details", "Warm & Romantic example · Details | SaveTheDates"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
  }
  await page.goto("/dashboard/preview");
  await expect(page).toHaveURL(/\/account\/sign-in/);
  await expectGenericHead(page, "/not-a-site");
  await expect(page.getByRole("link", { name: "Go to home" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account/sign-in");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("not-found.png"), fullPage: true });
  expect((await request.get("/favicon.ico")).status()).toBe(200);
});
