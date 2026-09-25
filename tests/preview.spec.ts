import { expect, test } from "@playwright/test";

// The /demo fixtures exist only in development; CI checks them through the development container.
const demoOnly = () => test.skip(!!process.env.E2E_PRODUCTION, "Demo fixtures exist only in development");

test("demo shows the announcement without unavailable controls", async ({ page }) => {
  demoOnly();
  const response = await page.goto("/demo");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Save the Date" })).toBeVisible();
  await expect(page.locator(".couple-names")).toHaveText("Chloe&Ross");
  await expect(page.locator("time")).toHaveText("14 June 2027");
  await expect(page.getByText("Lake Como, Italy")).toBeVisible();
  await expect(page.getByText("We’re getting married", { exact: false })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const photo = page.getByRole("img");
  await expect(photo).toBeVisible();
  await expect(photo).toHaveJSProperty("naturalWidth", 1600);
  await expect(page.getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveText(/RSVP|View Details/);
  await page.screenshot({ path: test.info().outputPath("demo.png"), fullPage: true });
});

test("unknown names and guest links return a non-revealing 404", async ({ page }) => {
  for (const path of ["/not-a-wedding", `/not-a-wedding/${"x".repeat(43)}`, `/demo/${"x".repeat(43)}`]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator("body")).not.toHaveText(/Chloe|Ross/);
  }
});

for (const slug of ["demo-no-photo", "demo-long-names"]) {
  test(`${slug} remains readable without overflow`, async ({ page }) => {
    demoOnly();
    await page.goto(`/${slug}`);
    await expect(page.getByRole("heading", { name: "Save the Date" })).toBeVisible();
    await expect(page.getByRole("img")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${slug}.png`), fullPage: true });
  });
}

test("failed photography falls back without losing the announcement", async ({ page }) => {
  demoOnly();
  await page.route("**/preview-photo", (route) => route.abort());
  await page.goto("/demo");
  await expect(page.getByRole("img")).toHaveCount(0);
  await expect(page.getByTestId("wedding-photo")).toBeVisible();
  await expect(page.locator("time")).toHaveText("14 June 2027");
});

test("homepage content is keyboard accessible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Create your save the date" }).first()).toBeFocused();
});
