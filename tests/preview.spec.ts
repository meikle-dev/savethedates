import { expect, test } from "@playwright/test";

test("demo shows the announcement without unavailable controls", async ({ page }) => {
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

test("unknown slugs return a non-revealing 404", async ({ page }) => {
  const response = await page.goto("/not-a-wedding");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveText(/Chloe|Ross/);
});

for (const slug of ["demo-no-photo", "demo-long-names"]) {
  test(`${slug} remains readable without overflow`, async ({ page }) => {
    await page.goto(`/${slug}`);
    await expect(page.getByRole("heading", { name: "Save the Date" })).toBeVisible();
    await expect(page.getByRole("img")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${slug}.png`), fullPage: true });
  });
}

test("failed photography falls back without losing the announcement", async ({ page }) => {
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
