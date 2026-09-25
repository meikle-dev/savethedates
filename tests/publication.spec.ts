import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

const local = localSupabase();
test("owner previews, uploads, publishes, updates and unpublishes a wedding", async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  const email = `publication-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const { data, error } = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error("Unable to create local test owner");
  const ownerId = data.user.id;
  const slug = `alex-${crypto.randomUUID()}`;
  const guest = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const guestPage = await guest.newPage();
  const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#738c79" } }).jpeg().toBuffer();
  const replacementPhoto = await sharp({ create: { width: 600, height: 900, channels: 3, background: "#a86464" } }).jpeg().toBuffer();
  let weddingId: string | undefined;
  const openSection = (name: string) => openWorkspaceSection(page, name);
  // The header status is shown from 768px; it must follow publish and unpublish without a manual reload.
  const expectHeaderStatus = async (status: string) => {
    if (test.info().project.name === "desktop") await expect(page.getByRole("banner").getByText(status, { exact: true })).toBeVisible();
  };
  try {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Your name", { exact: false }).fill("Alex");
    await page.locator('[name="second_name"]').fill("Morgan");
    await page.locator('[name="wedding_date"]').fill("2027-09-18");
    await page.locator('[name="location"]').fill("Bath, England");
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.getByRole("status")).toContainText("private draft has been saved");
    const saved = (await local.admin.from("weddings").select("id, rsvp_share_secret").eq("owner_id", ownerId).single()).data!;
    weddingId = saved.id;
    const secret = saved.rsvp_share_secret as string;
    const home = `/${slug}/${secret}`;
    expect((await local.grantEntitlement(weddingId!, ownerId)).error).toBeNull();
    await openSection("Publish");
    await page.getByRole("link", { name: "Preview saved site" }).click();
    await expect(page.getByRole("heading", { name: "Save the Date" })).toBeVisible();
    expect((await guest.request.get("/dashboard/photo")).status()).toBe(404);
    await guestPage.goto("/dashboard/preview");
    await expect(guestPage).toHaveURL(/account\/sign-in/);
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await openSection("Design");
    const cancelledChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose photo" }).press("Enter");
    await (await cancelledChooser).setFiles([]);
    await expect(page.getByAltText("Your saved wedding photo")).toHaveCount(0);
    await page.getByLabel("Photo file").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: photo });
    await expect(page.getByRole("status").filter({ hasText: "photo has been saved" })).toBeVisible();
    await expect(page.getByAltText("Your saved wedding photo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change photo" })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Frame your photo" })).toBeVisible();
    const horizontal = page.locator('input[name="x"]');
    const vertical = page.locator('input[name="y"]');
    const zoom = page.locator('input[name="zoom"]');
    const mobileCrop = page.locator('.photo-framing-viewport[data-preview-size="mobile"]');
    await mobileCrop.scrollIntoViewIfNeeded();
    const cropBounds = await mobileCrop.boundingBox();
    if (!cropBounds) throw new Error("Framing preview is not visible");
    await page.mouse.move(cropBounds.x + cropBounds.width / 2, cropBounds.y + cropBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(cropBounds.x + cropBounds.width * 0.7, cropBounds.y + cropBounds.height * 0.7);
    await page.mouse.up();
    await expect(horizontal).not.toHaveValue("50");
    await page.getByRole("button", { name: "Revert to saved crop" }).click();
    await expect(horizontal).toHaveValue("50");
    await horizontal.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(horizontal).toHaveValue("49");
    await page.getByRole("button", { name: "Revert to saved crop" }).click();
    await horizontal.fill("20");
    await vertical.fill("70");
    await zoom.fill("1.3");
    await page.getByRole("button", { name: "Save framing for Save the Date" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Photo framing saved" })).toBeVisible();
    await page.getByLabel("Details", { exact: true }).check();
    await horizontal.fill("80");
    await vertical.fill("30");
    await zoom.fill("1.2");
    await page.getByRole("button", { name: "Save framing for Details" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Photo framing saved" })).toBeVisible();
    await horizontal.fill("10");
    await page.getByRole("button", { name: "Reset to default crop" }).click();
    await expect(horizontal).toHaveValue("50");
    await expect(vertical).toHaveValue("60");
    await expect(zoom).toHaveValue("1");
    await page.getByRole("button", { name: "Revert to saved crop" }).click();
    await expect(horizontal).toHaveValue("80");
    expect((await local.admin.from("weddings").select("photo_framing").eq("id", weddingId).single()).data!.photo_framing).toEqual({
      minimal: { saveTheDate: { x: 20, y: 70, zoom: 1.3 }, details: { x: 80, y: 30, zoom: 1.2 } },
    });
    const firstPhotoSrc = await page.getByAltText("Your saved wedding photo").getAttribute("src");
    await page.getByLabel("Photo file").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: photo });
    await expect(page.getByAltText("Your saved wedding photo")).not.toHaveAttribute("src", firstPhotoSrc!);
    expect((await page.request.get("/dashboard/photo")).status()).toBe(200);
    await page.getByLabel("Photo file").setInputFiles({ name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not a photo") });
    await expect(page.getByRole("main").getByRole("alert")).toContainText("couldn’t read that photo");
    await expect(page.getByAltText("Your saved wedding photo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change photo" })).toBeFocused();
    expect((await page.request.get("/dashboard/photo")).status()).toBe(200);
    expect((await local.admin.from("weddings").select("photo_framing").eq("id", weddingId).single()).data!.photo_framing).toEqual({});
    await page.getByLabel("Save the Date", { exact: true }).check();
    await page.locator('input[name="x"]').fill("20");
    await page.locator('input[name="y"]').fill("70");
    await page.locator('input[name="zoom"]').fill("1.3");
    await page.getByRole("button", { name: "Save framing for Save the Date" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Photo framing saved" })).toBeVisible();
    await page.getByLabel("Details", { exact: true }).check();
    await page.locator('input[name="x"]').fill("80");
    await page.locator('input[name="y"]').fill("30");
    await page.locator('input[name="zoom"]').fill("1.2");
    await page.getByRole("button", { name: "Save framing for Details" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Photo framing saved" })).toBeVisible();
    await page.getByRole("link", { name: /Change theme/ }).click();
    await page.getByRole("radio", { name: /Warm & Romantic/ }).check();
    await page.getByRole("button", { name: "Apply theme", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Theme saved to your private draft");
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await openSection("Design");
    await expect(page.getByText("Editing Warm & Romantic")).toBeVisible();
    await expect(page.locator('input[name="x"]')).toHaveValue("50");
    await page.getByRole("link", { name: /Change theme/ }).click();
    await page.getByRole("radio", { name: /Modern Minimal/ }).check();
    await page.getByRole("button", { name: "Apply theme", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Theme saved to your private draft");
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await openSection("Design");
    await expect(page.getByText("Editing Modern Minimal")).toBeVisible();
    await expect(page.locator('input[name="x"]')).toHaveValue("20");
    await openSection("Publish");
    // The names part is suggested from the couple's names, and the future guest link is shown before publication.
    const namesField = page.getByLabel("Names in your guest link");
    await expect(namesField).toHaveValue("alex-and-morgan");
    const origin = new URL(baseURL!).origin;
    const guestLink = `${origin}${home}`;
    await expect(page.getByText("Works once published")).toBeVisible();
    await expect(page.getByText(`${origin}/alex-and-morgan/${secret}`, { exact: true })).toBeVisible();
    // A draft shows the future link as not yet working, with no share panel or share and copy actions.
    await expect(page.locator("#guest-link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Share on WhatsApp/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Share|Copy)/ })).toHaveCount(0);
    // A format error and a missing consent are shown together, next to their fields, without a browser pop-up.
    await namesField.fill("dashboard");
    await page.getByRole("button", { name: "Publish site", exact: true }).click();
    await expect(page.locator("#slug-error")).toContainText("used by SaveTheDates pages");
    await expect(page.locator("#visibility-error")).toContainText("Confirm that anyone with your guest link can view your site.");
    await expect(namesField).toHaveAttribute("aria-invalid", "true");
    await expect(namesField).toHaveAttribute("aria-describedby", /slug-error/);
    await expect(page.getByText(`/dashboard/${secret}`)).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("publish-errors.png"), fullPage: true });
    await page.getByRole("checkbox", { name: /I understand that anyone with our guest link/ }).check();
    await namesField.fill(` ${slug.toUpperCase()} `);
    await expect(page.getByText(guestLink, { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("private-workspace.png"), fullPage: true });
    expect((await guest.request.get(home)).status()).toBe(404);
    await page.getByRole("button", { name: "Publish site", exact: true }).click();
    await expect(page.getByText("Your site is live for anyone with your guest link.")).toBeVisible();
    // F042: publishing leads straight to the share panel, with the absolute guest link on the configured origin.
    const panel = page.locator("#guest-link");
    await expect(panel.getByRole("status").filter({ hasText: "Your wedding site is published" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Your guest link" })).toBeFocused();
    await expect(panel.getByText(guestLink, { exact: true })).toBeVisible();
    await expect(panel.getByRole("link", { name: /Open your site/ })).toHaveAttribute("href", guestLink);
    // Publishing never opens RSVP; the panel says RSVPs are off.
    await expect(panel.getByText("RSVPs off", { exact: true })).toBeVisible();
    expect((await local.admin.from("weddings").select("rsvp_enabled").eq("id", weddingId).single()).data!.rsvp_enabled).toBe(false);
    const message = `Save the date! Alex & Morgan are getting married on 18 September 2027 at Bath, England. Find out more: ${guestLink}`;
    const messageField = panel.getByLabel("Message to send");
    await expect(messageField).toHaveValue(message);
    const whatsApp = panel.getByRole("link", { name: /Share on WhatsApp/ });
    const whatsAppText = async () => { const href = new URL((await whatsApp.getAttribute("href"))!); expect(href.origin + href.pathname).toBe("https://wa.me/"); return href.searchParams.get("text"); };
    expect(await whatsAppText()).toBe(message);
    await expect(whatsApp).toHaveAttribute("rel", "noopener noreferrer");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await panel.getByRole("button", { name: "Copy link" }).click();
    await expect(panel.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(guestLink);
    // The couple can edit the message; the full link is added back if they remove it.
    await messageField.fill("Can’t wait to celebrate with you!");
    const edited = `Can’t wait to celebrate with you!\n${guestLink}`;
    expect(await whatsAppText()).toBe(edited);
    await panel.getByRole("button", { name: "Copy message" }).click();
    await expect(panel.getByRole("status").filter({ hasText: "Message copied." })).toBeVisible();
    // Windows stores clipboard line breaks as CRLF.
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(edited);
    await panel.getByRole("button", { name: "Restore suggested message" }).click();
    await expect(messageField).toHaveValue(message);
    // A later save on the same visit retires the publishing notice.
    await page.getByRole("button", { name: "Save link names" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Links you already shared still work" })).toBeVisible();
    await expect(panel.getByText("Your wedding site is published")).toHaveCount(0);
    await expectHeaderStatus("Published");
    await page.screenshot({ path: test.info().outputPath("published-workspace.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const response = await guestPage.goto(home);
    expect(response!.status()).toBe(200);
    expect(response!.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response!.headers()["x-robots-tag"]).toContain("noindex");
    // Names alone, and a valid names part with an unknown secret, give the same 404.
    expect((await guest.request.get(`/${slug}`)).status()).toBe(404);
    expect((await guest.request.get(`/${slug}/${"x".repeat(43)}`)).status()).toBe(404);
    // Development Next.js uses mandatory revalidation; production dynamic pages use no-store.
    expect(response!.headers()["cache-control"]).toMatch(/no-store|no-cache, must-revalidate/);
    if (process.env.E2E_PRODUCTION) expect(response!.headers()["cache-control"]).toContain("no-store");
    await expect(guestPage.getByText("Bath, England", { exact: true })).toBeVisible();
    await expect(guestPage.locator(".wedding-photo img")).toHaveCSS("object-position", "20% 70%");
    await expect(guestPage.locator(".wedding-photo img")).toHaveCSS("transform", /matrix\(1\.3/);
    await expect(guestPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(guestPage.locator(".wedding-photo img")).toHaveAttribute("src", new RegExp(`${home}/photo$`));
    const asset = await guest.request.get(`${home}/photo`);
    expect(asset.status()).toBe(200);
    expect(asset.headers()["cache-control"]).toContain("no-store");
    expect(asset.headers()["content-type"]).toBe("image/webp");
    await guestPage.screenshot({ path: test.info().outputPath("published-guest.png"), fullPage: true });
    expect((await local.admin.from("weddings").update({ details_enabled: true, ceremony_venue: "The Orangery" }).eq("id", weddingId)).error).toBeNull();
    await guestPage.goto(`${home}/details`);
    await expect(guestPage.getByRole("heading", { name: "Wedding details" })).toBeVisible();
    await expect(guestPage.locator(".wedding-photo img")).toHaveCSS("object-position", "80% 30%");
    await expect(guestPage.locator(".wedding-photo img")).toHaveCSS("transform", /matrix\(1\.2/);
    // No guest page sends the private storage path (which contains the wedding ID) in its HTML or RSC payload.
    for (const path of [home, `${home}/details`, `${home}/rsvp`]) {
      const html = await (await guest.request.get(path)).text();
      expect(html, path).toContain("Alex");
      expect(html, path).not.toContain(weddingId!);
      expect(html, path).not.toContain("photo_path");
    }
    await guestPage.goto(home);
    await openSection("Basics");
    await page.locator('[name="location"]').fill("Bristol, England");
    await page.getByRole("button", { name: "Save live changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "live wedding site has been updated" })).toBeVisible();
    await guestPage.reload();
    await expect(guestPage.getByText("Bristol, England", { exact: true })).toBeVisible();
    await openSection("Design");
    await page.getByLabel("Photo file").setInputFiles({ name: "replacement.jpg", mimeType: "image/jpeg", buffer: replacementPhoto });
    await expect(page.getByRole("status").filter({ hasText: "photo has been saved" })).toBeVisible();
    await page.reload();
    await expect(page.getByAltText("Your saved wedding photo")).toBeVisible();
    expect((await local.admin.from("weddings").select("photo_framing").eq("id", weddingId).single()).data!.photo_framing).toEqual({});
    await expect(page.locator('input[name="x"]')).toHaveValue("50");
    const ownerReplacement = await page.request.get("/dashboard/photo");
    const guestReplacement = await guest.request.get(`${home}/photo`);
    expect(ownerReplacement.status()).toBe(200);
    expect(guestReplacement.status()).toBe(200);
    const [ownerStats, guestStats] = await Promise.all([
      sharp(await ownerReplacement.body()).stats(),
      sharp(await guestReplacement.body()).stats(),
    ]);
    expect(ownerStats.channels[0].mean).toBeGreaterThan(ownerStats.channels[1].mean);
    expect(guestStats.channels[0].mean).toBeGreaterThan(guestStats.channels[1].mean);
    // The names part can change after publishing; links with the earlier names redirect to the current one.
    await openSection("Publish");
    const renamed = `${slug}-renamed`;
    await page.getByLabel("Names in your guest link").fill(renamed);
    await page.getByRole("button", { name: "Save link names" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Links you already shared still work" })).toBeVisible();
    // Every display of the link, and the suggested message, follow the saved names.
    await expect(panel.getByText(`${origin}/${renamed}/${secret}`, { exact: true })).toBeVisible();
    await expect(messageField).toHaveValue(message.replace("Bath", "Bristol").replace(guestLink, `${origin}/${renamed}/${secret}`));
    await guestPage.goto(`${home}/details`);
    await expect(guestPage).toHaveURL(new RegExp(`/${renamed}/${secret}/details$`));
    await guestPage.goto(`/altered-names/${secret}`);
    await expect(guestPage).toHaveURL(new RegExp(`/${renamed}/${secret}$`));
    await page.getByLabel("Names in your guest link").fill(slug);
    await page.getByRole("button", { name: "Save link names" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Links you already shared still work" })).toBeVisible();
    await page.getByRole("button", { name: "Unpublish site" }).click();
    await expect(page.getByText("Your site is private until you publish it.")).toBeVisible();
    await expectHeaderStatus("Private draft");
    // Unpublished: no share panel, and the earlier publishing notice is gone.
    await expect(page.locator("#guest-link")).toHaveCount(0);
    await expect(page.getByText("Your wedding site is published")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Share on WhatsApp/ })).toHaveCount(0);
    await expect(page.getByLabel("Names in your guest link")).toBeEditable();
    expect((await guest.request.get(home)).status()).toBe(404);
    expect((await guest.request.get(`${home}/photo`)).status()).toBe(404);
    expect((await page.request.get("/dashboard/photo")).status()).toBe(200);
    await openSection("Design");
    await page.getByLabel("Photo file").setInputFiles({ name: "oversized.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(7 * 1024 * 1024) });
    await expect(page.getByRole("alert").filter({ hasText: "over 5 MB" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Change photo" })).toBeFocused();
    await page.getByRole("button", { name: "Remove photo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "photo has been removed" })).toBeVisible();
    expect((await page.request.get("/dashboard/photo")).status()).toBe(404);
    await openSection("Publish");
    await expect(page.getByLabel("Names in your guest link")).toHaveValue(slug);
    await page.getByRole("checkbox", { name: /I understand that anyone with our guest link/ }).check();
    await page.getByRole("button", { name: "Publish site", exact: true }).click();
    await expect(page.getByText("Your site is live for anyone with your guest link.")).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Your guest link" })).toBeFocused();
    await expect(panel.getByText(guestLink, { exact: true })).toBeVisible();
    await expectHeaderStatus("Published");
    expect((await guest.request.get(home)).status()).toBe(200);
    expect((await guest.request.get(`${home}/photo`)).status()).toBe(404);
  } finally {
    await guest.close();
    if (weddingId) {
      const files = await local.admin.storage.from("wedding-photos").list(weddingId);
      if (files.data?.length) await local.admin.storage.from("wedding-photos").remove(files.data.map((file) => `${weddingId}/${file.name}`));
    }
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
