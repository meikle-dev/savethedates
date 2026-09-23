import { expect, test, type Response } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();

function expectPrivateInviteResponse(response: Response | null) {
  expect(response).not.toBeNull();
  const headers = response!.headers();
  if (process.env.E2E_PRODUCTION) {
    expect(headers["cache-control"]).toContain("private");
    expect(headers["cache-control"]).toContain("no-store");
  } else {
    // The Next.js development server replaces application cache directives.
    expect(headers["cache-control"]).toMatch(/no-store|no-cache, must-revalidate/);
  }
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-robots-tag"]).toContain("noindex");
}

test("owner creates an invitation and a guest submits, corrects, and sees closure", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const email = `rsvp-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const slug = `rsvp-e2e-${crypto.randomUUID()}`;
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create RSVP browser-test owner");
  const ownerId = created.data.user.id;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  let guestPage = await guest.newPage();
  try {
    const wedding = await local.admin.from("weddings").insert({
      owner_id: ownerId,
      first_name: "Alex",
      second_name: "Morgan",
      wedding_date: "2027-09-18",
      location: "Bath",
      slug,
      details_enabled: true,
      ceremony_venue: "Bath Abbey",
      ceremony_url: "https://example.com/directions",
    }).select("id").single();
    expect(wedding.error).toBeNull();
    expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.getByRole("link", { name: "RSVP" })).toHaveCount(0);

    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const section = page.getByRole("region", { name: "RSVP" });
    await expect(section).toBeVisible();
    await section.getByLabel("Accept RSVPs").check();
    await section.getByRole("button", { name: "Save RSVP settings" }).click();
    await expect(section.getByRole("status")).toContainText("enabled");
    await section.getByLabel("Guest or household name").fill("Sam Taylor");
    await section.getByRole("button", { name: "Create link" }).click();
    await expect(section.getByText("Copy this private link now")).toBeVisible();
    await expect(section.getByText("For: Sam Taylor")).toBeVisible();
    await expect(section.getByText(`Wedding URL: /${slug}`)).toBeVisible();
    const inviteUrl = await section.getByLabel("New private link").inputValue();
    expect(inviteUrl).toMatch(new RegExp(`^/${slug}/rsvp\\?invite=`));
    const inviteToken = new URL(inviteUrl, baseURL).searchParams.get("invite");
    expect(inviteToken).toHaveLength(43);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseURL!).origin });
    await section.getByRole("button", { name: "Copy full link" }).click();
    await expect(section.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(inviteUrl, baseURL).href);
    await section.getByLabel("Guest or household name").fill("Jordan Lee");
    await section.getByRole("button", { name: "Create link" }).click();
    await expect(section.getByText("For: Jordan Lee")).toBeVisible();
    const secondInviteUrl = await section.getByLabel("New private link").inputValue();
    const secondToken = new URL(secondInviteUrl, baseURL).searchParams.get("invite");
    expect(secondToken).toHaveLength(43);
    expect(secondToken).not.toBe(inviteToken);
    await page.screenshot({ path: test.info().outputPath("rsvp-workspace.png"), fullPage: true });

    await guestPage.close();
    guestPage = await guest.newPage();
    const inviteResponse = await guestPage.goto(inviteUrl);
    expectPrivateInviteResponse(inviteResponse);
    await expect(guestPage.getByRole("heading", { name: "RSVP" })).toBeVisible();
    await expect(guestPage.getByText("This invitation is for Sam Taylor.")).toBeVisible();
    await expect(guestPage.locator(".rsvp-invitation-context")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(guestPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(guestPage.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");

    const headerPage = await guest.newPage();
    expectPrivateInviteResponse(await headerPage.goto(`/${slug}?invite=${inviteToken}`));
    expectPrivateInviteResponse(await headerPage.goto(`/${slug}/details?invite=${inviteToken}`));
    await headerPage.close();

    await guestPage.getByRole("link", { name: "Save the date" }).click();
    await expect(guestPage).toHaveURL(new URL(`/${slug}?invite=${inviteToken}`, baseURL).href);
    expectPrivateInviteResponse(await guestPage.reload());
    await guestPage.getByRole("link", { name: "Details" }).click();
    await expect(guestPage).toHaveURL(new URL(`/${slug}/details?invite=${inviteToken}`, baseURL).href);
    await guestPage.goBack();
    await expect(guestPage).toHaveURL(new URL(`/${slug}?invite=${inviteToken}`, baseURL).href);
    await guestPage.goForward();
    await expect(guestPage).toHaveURL(new URL(`/${slug}/details?invite=${inviteToken}`, baseURL).href);
    let outboundReferer: string | undefined;
    await guestPage.route("https://example.com/**", async (route) => {
      outboundReferer = route.request().headers()["referer"];
      await route.fulfill({ status: 200, contentType: "text/html", body: "Directions" });
    });
    await guestPage.getByRole("link", { name: "Directions to the ceremony" }).click();
    expect(outboundReferer).toBeUndefined();
    await guestPage.goBack();
    await expect(guestPage).toHaveURL(new URL(`/${slug}/details?invite=${inviteToken}`, baseURL).href);
    await guestPage.getByRole("link", { name: "RSVP" }).click();
    await expect(guestPage).toHaveURL(new URL(inviteUrl, baseURL).href);
    await expect(guestPage.getByText("This invitation is for Sam Taylor.")).toBeVisible();

    const secondTab = await guest.newPage();
    await secondTab.goto(secondInviteUrl);
    await expect(secondTab.getByText("This invitation is for Jordan Lee.")).toBeVisible();
    await guestPage.reload();
    await expect(guestPage.getByText("This invitation is for Sam Taylor.")).toBeVisible();
    await guestPage.goto(secondInviteUrl);
    await expect(guestPage.getByText("This invitation is for Jordan Lee.")).toBeVisible();
    await secondTab.close();
    await guestPage.goto(inviteUrl);

    const publicPage = await guest.newPage();
    await publicPage.goto(`/${slug}/rsvp`);
    await expect(publicPage.getByText("This RSVP link is unavailable")).toBeVisible();
    await expect(publicPage.getByText("This invitation is for Sam Taylor.")).toHaveCount(0);
    await publicPage.screenshot({ path: test.info().outputPath("rsvp-unavailable.png"), fullPage: true });
    await publicPage.goto(`/${slug}/rsvp?invite=${inviteToken}&invite=${inviteToken}`);
    await expect(publicPage.getByText("This RSVP link is unavailable")).toBeVisible();
    await publicPage.close();

    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByText("Enter your name.")).toBeVisible();
    await expect(guestPage.getByText("Choose attending or not attending.")).toBeVisible();
    await guestPage.screenshot({ path: test.info().outputPath("rsvp-validation.png"), fullPage: true });
    await guestPage.getByLabel("Your name").fill("Sam Taylor");
    await guestPage.getByLabel("Joyfully accepts").check();
    await guestPage.getByRole("button", { name: "Send RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("saved");
    await guestPage.screenshot({ path: test.info().outputPath("rsvp-success.png"), fullPage: true });
    await guestPage.reload();
    await expect(guestPage.getByLabel("Your name")).toHaveValue("Sam Taylor");
    await guestPage.getByLabel("Regretfully declines").check();
    await guestPage.getByLabel("Your name").fill("Sam T.");
    await guestPage.getByRole("button", { name: "Update RSVP" }).click();
    await expect(guestPage.getByRole("status")).toContainText("saved");

    await page.reload();
    const updatedSection = page.getByRole("region", { name: "RSVP" });
    await expect(updatedSection.getByText("Not attending")).toBeVisible();
    await expect(updatedSection.getByText(/Response from Sam T\./)).toBeVisible();
    const longName = "Alexandria-Catherine";
    const longInvite = "The Taylor and Rivera family, with everyone celebrating together";
    expect((await local.admin.from("weddings").update({ first_name: longName, second_name: "Maximilian-Alexander" }).eq("owner_id", ownerId)).error).toBeNull();
    expect((await local.admin.from("rsvp_invitations").update({ invite_name: longInvite }).eq("wedding_id", wedding.data!.id).eq("invite_name", "Sam Taylor")).error).toBeNull();
    for (const theme of ["minimal", "romantic", "bold"]) {
      expect((await local.admin.from("weddings").update({ theme }).eq("owner_id", ownerId)).error).toBeNull();
      await guestPage.reload();
      await expect(guestPage.locator(".wedding-shell")).toHaveAttribute("data-theme", theme);
      await expect(guestPage.getByText(`This invitation is for ${longInvite}.`)).toBeVisible();
      for (const width of [320, 390, 1440]) {
        await guestPage.setViewportSize({ width, height: 900 });
        expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} RSVP fits ${width}px`).toBe(true);
      }
      const submit = guestPage.getByRole("button", { name: "Update RSVP" });
      await submit.focus();
      const focusContrast = await submit.evaluate((button) => {
        const luminance = (color: string) => {
          const [r, g, b] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const outline = luminance(getComputedStyle(button).outlineColor);
        const surface = luminance(getComputedStyle(button.closest(".rsvp-card")!).backgroundColor);
        return (Math.max(outline, surface) + 0.05) / (Math.min(outline, surface) + 0.05);
      });
      expect(focusContrast, `${theme} keyboard focus has at least 3:1 contrast`).toBeGreaterThanOrEqual(3);
      await guestPage.setViewportSize({ width: test.info().project.name === "mobile" ? 390 : 1440, height: 900 });
      await guestPage.screenshot({ path: test.info().outputPath(`rsvp-${theme}.png`), fullPage: true });
      if (theme === "romantic") {
        const fallbackPage = await guest.newPage();
        await fallbackPage.setViewportSize({ width: 1440, height: 900 });
        await fallbackPage.route("**/romantic-rsvp-floral.webp", route => route.abort());
        await fallbackPage.goto(inviteUrl);
        await expect(fallbackPage.getByRole("heading", { name: "RSVP" })).toBeVisible();
        await expect(fallbackPage.getByRole("button", { name: "Update RSVP" })).toBeVisible();
        expect(await fallbackPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await fallbackPage.screenshot({ path: test.info().outputPath("rsvp-romantic-failed-backdrop.png"), fullPage: true });
        await fallbackPage.close();
        const phone = await guest.newPage();
        const floralRequests: string[] = [];
        phone.on("request", request => {
          if (request.url().includes("romantic-rsvp-floral.webp")) floralRequests.push(request.url());
        });
        await phone.setViewportSize({ width: 390, height: 844 });
        await phone.goto(inviteUrl);
        await expect(phone.getByRole("heading", { name: "RSVP" })).toBeVisible();
        expect(floralRequests, "phone does not download the desktop backdrop").toEqual([]);
        await phone.close();
      }
    }
    expect((await local.admin.from("rsvp_invitations").update({ invite_name: "Sam Taylor" }).eq("wedding_id", wedding.data!.id).eq("invite_name", longInvite)).error).toBeNull();

    await updatedSection.getByLabel("Accept RSVPs").uncheck();
    await updatedSection.getByRole("button", { name: "Save RSVP settings" }).click();
    await expect(updatedSection.getByRole("status")).toContainText("closed");
    await guestPage.reload();
    await expect(guestPage.getByRole("heading", { name: "RSVP is closed" })).toBeVisible();
    await expect(guestPage.getByText("Saved response: Sam T. · Not attending")).toBeVisible();
    await guestPage.screenshot({ path: test.info().outputPath("rsvp-closed.png"), fullPage: true });
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.getByRole("link", { name: "RSVP" })).toHaveCount(0);

    await guestPage.goto(inviteUrl);
    await expect(guestPage.getByRole("heading", { name: "RSVP is closed" })).toBeVisible();
    const samInvitation = updatedSection.getByRole("listitem").filter({ hasText: "Sam Taylor" });
    await samInvitation.getByRole("button", { name: "Revoke link" }).click();
    await expect(samInvitation.getByText("Revoked")).toBeVisible();
    await guestPage.reload();
    await expect(guestPage.getByText("This RSVP link is unavailable")).toBeVisible();
    await guestPage.screenshot({ path: test.info().outputPath("rsvp-revoked.png"), fullPage: true });
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
