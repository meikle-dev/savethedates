import { expect, test } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();

test("owners can preview saved RSVP content without granting guest access or saving responses", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const email = `rsvp-preview-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const ownerId = created.data.user!.id;
  const other = await local.admin.auth.admin.createUser({ email: `rsvp-other-${crypto.randomUUID()}@example.test`, password, email_confirm: true });
  expect(other.error).toBeNull();
  const otherId = other.data.user!.id;
  const slug = `preview-${crypto.randomUUID()}`;
  const otherSlug = `other-${crypto.randomUUID()}`;
  const anonymous = await browser.newContext({ baseURL });
  const guest = await anonymous.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Jamie", second_name: "Riley", wedding_date: "2027-09-18", location: "Bath", details_enabled: true, ceremony_venue: "Bath Abbey" }).select("id").single();
    expect(wedding.error).toBeNull();
    const weddingId = wedding.data!.id;
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Jamie & Riley" })).toBeVisible();
    await page.getByRole("navigation", { name: "Workspace sections" }).getByRole("link", { name: "RSVP", exact: true }).click();
    await page.getByRole("link", { name: "Preview RSVP page" }).click();
    await expect(page.getByRole("heading", { name: "RSVP", exact: true })).toBeVisible();
    await expect(page.getByText("Private RSVP preview", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
    await expect(page.locator("input[name=token]")).toHaveCount(0);
    await page.getByLabel("Your name").fill("Preview visitor");
    await page.getByLabel("Joyfully accepts").check();
    await page.getByLabel("Your name").press("Enter");
    expect((await local.admin.from("rsvp_invitations").select("id").eq("wedding_id", weddingId)).data).toEqual([]);

    const designs = page.getByRole("region", { name: "Preview controls" });
    await designs.getByRole("radio", { name: /Modern & Bold/ }).check();
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "bold");
    await expect(page.getByText("Preview only — this theme has not been applied.", { exact: false })).toBeVisible();
    expect((await local.admin.from("weddings").select("theme").eq("id", weddingId).single()).data?.theme).toBe("minimal");
    await page.getByRole("button", { name: "Apply theme", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Theme saved");
    await expect(page.getByText("Your current wedding theme.", { exact: false })).toBeVisible();
    await page.reload();
    await expect(designs.getByRole("radio", { name: /Modern & Bold/ })).toBeChecked();
    expect((await local.admin.from("weddings").select("theme").eq("id", weddingId).single()).data?.theme).toBe("bold");
    await designs.getByRole("radio", { name: /Modern Minimal/ }).check();
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "minimal");
    await page.getByRole("button", { name: "Apply theme", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Theme saved");

    for (const theme of ["minimal", "romantic", "bold"]) {
      await page.goto(`/dashboard/preview?theme=${theme}`);
      await page.getByRole("link", { name: "RSVP", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/preview/rsvp\\?theme=${theme}$`));
      await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".wedding-shell")).toContainText("Jamie");
      await expect(page.locator(".wedding-shell")).toContainText("Riley");
      await expect(page.locator(".wedding-shell")).not.toContainText("Alex");
      await expect(page.getByRole("heading", { name: "Invitation unavailable" })).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`rsvp-preview-${theme}.png`), fullPage: true });
      await page.getByRole("link", { name: "Details", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/preview/details\\?theme=${theme}$`));
      await page.getByRole("link", { name: "RSVP", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/preview/rsvp\\?theme=${theme}$`));
      await page.reload();
      await expect(page.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
      await page.getByRole("link", { name: "Save the date", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/preview\\?theme=${theme}$`));
    }
    await guest.goto("/dashboard/preview/rsvp");
    await expect(guest).toHaveURL(/account\/sign-in/);
    await expect(guest.getByText("Jamie", { exact: false })).toHaveCount(0);

    expect((await local.grantEntitlement(weddingId, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ slug, published: true, rsvp_enabled: true }).eq("id", weddingId)).error).toBeNull();
    await page.goto(`/${slug}`);
    await page.getByRole("link", { name: "RSVP", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/preview\/rsvp$/);
    await expect(page.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
    await guest.goto(`/${slug}/rsvp`);
    await expect(guest.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();
    for (const credential of ["", "invalid", "A".repeat(43), `${"A".repeat(43)}&invite=${"A".repeat(43)}`]) {
      await page.goto(`/${slug}/rsvp?invite=${credential}`);
      await expect(page.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();
    }

    const otherWedding = await local.admin.from("weddings").insert({ owner_id: otherId, first_name: "Other", second_name: "Couple", wedding_date: "2027-09-18", location: "York", slug: otherSlug, rsvp_enabled: true }).select("id").single();
    expect(otherWedding.error).toBeNull();
    expect((await local.grantEntitlement(otherWedding.data!.id, otherId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", otherWedding.data!.id)).error).toBeNull();
    await page.goto(`/${otherSlug}/rsvp`);
    await expect(page.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();

    expect((await local.admin.from("weddings").update({ published: false }).eq("id", weddingId)).error).toBeNull();
    const hidden = await guest.goto(`/${slug}/rsvp`);
    expect(hidden?.status()).toBe(404);
    await page.goto("/dashboard/preview/rsvp?theme=invalid");
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "minimal");
    await expect(page.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await expect(page.getByRole("region", { name: "RSVP", exact: true })).toBeVisible();
  } finally {
    await anonymous.close();
    await local.admin.auth.admin.deleteUser(ownerId);
    await local.admin.auth.admin.deleteUser(otherId);
  }
});
