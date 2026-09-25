import { expect, test } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

const themeIds = themes.map(({ id }) => id);

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
    await openWorkspaceSection(page, "RSVP");
    await page.getByRole("link", { name: "Preview RSVP page" }).click();
    await expect(page.getByRole("heading", { name: "RSVP", exact: true })).toBeVisible();
    await expect(page.getByText("Private RSVP preview", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
    await expect(page.locator("input[name=secret]")).toHaveCount(0);
    await page.getByLabel("Your name").fill("Preview visitor");
    await page.getByLabel("Joyfully accepts").check();
    await page.getByLabel("Your name").press("Enter");
    expect((await local.admin.from("shared_rsvp_responses").select("id").eq("wedding_id", weddingId)).data).toEqual([]);

    const designs = page.getByRole("region", { name: "Preview controls" });
    await designs.getByRole("radio", { name: /Modern & Bold/ }).check();
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "bold");
    await expect(page.getByText("Preview only — this theme has not been applied.", { exact: false })).toBeVisible();
    expect((await local.admin.from("weddings").select("theme").eq("id", weddingId).single()).data?.theme).toBe("minimal");
    await page.getByRole("button", { name: "Apply theme", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Theme saved");
    await expect(page.getByText("This is your current theme.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(designs.getByRole("radio", { name: /Modern & Bold/ })).toBeChecked();
    expect((await local.admin.from("weddings").select("theme").eq("id", weddingId).single()).data?.theme).toBe("bold");
    await designs.getByRole("radio", { name: /Modern Minimal/ }).check();
    await expect(page.locator(".wedding-shell")).toHaveAttribute("data-theme", "minimal");
    await page.getByRole("button", { name: "Apply theme", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Theme saved");

    for (const theme of themeIds) {
      await page.goto(`/dashboard/preview?theme=${theme}`);
      await expect(page).toHaveTitle("Save the Date preview | SaveTheDates");
      await page.getByRole("link", { name: "RSVP", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/preview/rsvp\\?theme=${theme}$`));
      await expect(page).toHaveTitle("RSVP preview | SaveTheDates");
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
      await expect(page).toHaveTitle("Details preview | SaveTheDates");
      await page.getByRole("link", { name: "RSVP", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/preview/rsvp\\?theme=${theme}$`));
      await page.reload();
      const previewSubmit = page.getByRole("button", { name: "Send RSVP" });
      await expect(previewSubmit).toBeDisabled();
      await previewSubmit.hover({ force: true });
      await expect(previewSubmit).toHaveCSS("cursor", "not-allowed");
      await expect(previewSubmit).not.toHaveAttribute("aria-busy", "true");
      await page.getByRole("link", { name: "Save the date", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/preview\\?theme=${theme}$`));
    }
    await guest.goto("/dashboard/preview/rsvp");
    await expect(guest).toHaveURL(/account\/sign-in/);
    await expect(guest.getByText("Jamie", { exact: false })).toHaveCount(0);

    expect((await local.grantEntitlement(weddingId, ownerId)).error).toBeNull();
    const live = await local.admin.from("weddings").update({ slug, published: true, rsvp_enabled: true }).eq("id", weddingId).select("rsvp_share_secret").single();
    expect(live.error).toBeNull();
    const home = `/${slug}/${live.data!.rsvp_share_secret}`;
    await page.goto(home);
    await page.getByRole("link", { name: "RSVP", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${home}/rsvp$`));
    await expect(page.getByRole("button", { name: "Send RSVP" })).toBeEnabled();
    // The names part alone never opens the RSVP page, for guests or for the signed-in owner.
    expect((await guest.goto(`/${slug}/rsvp`))?.status()).toBe(404);
    expect((await page.goto(`/${slug}/rsvp`))?.status()).toBe(404);

    // Another couple may use the same names part; each secret opens only its own wedding.
    const otherWedding = await local.admin.from("weddings").insert({ owner_id: otherId, first_name: "Other", second_name: "Couple", wedding_date: "2027-09-18", location: "York", slug, rsvp_enabled: true }).select("id, rsvp_share_secret").single();
    expect(otherWedding.error).toBeNull();
    expect((await local.grantEntitlement(otherWedding.data!.id, otherId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", otherWedding.data!.id)).error).toBeNull();
    await guest.goto(`/${slug}/${otherWedding.data!.rsvp_share_secret}/rsvp`);
    await expect(guest.getByText("Other", { exact: false }).first()).toBeVisible();
    await expect(guest.getByText("Jamie", { exact: false })).toHaveCount(0);
    await guest.goto(`${home}/rsvp`);
    await expect(guest.getByText("Jamie", { exact: false }).first()).toBeVisible();
    await expect(guest.getByText("Other", { exact: false })).toHaveCount(0);

    expect((await local.admin.from("weddings").update({ published: false }).eq("id", weddingId)).error).toBeNull();
    const hidden = await guest.goto(`${home}/rsvp`);
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
