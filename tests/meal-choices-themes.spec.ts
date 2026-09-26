import { expect, test } from "@playwright/test";
import { themes } from "../src/features/weddings/themes";

// F068: every theme shares one RSVP renderer, so each theme's example page (with the fictional three-course menu) is
// checked for the same questions, reveal and fit at this project's width and at 320px. One test per theme keeps each
// well inside the 30-second limit.
for (const { id: theme } of themes) {
  test(`${theme}: meal and dietary questions appear only after accepting and fit the card`, async ({ page }) => {
    await page.goto(`/examples/${theme}/rsvp`);
    const card = page.getByRole("region", { name: "Invitation response" });
    await expect(card.getByRole("group", { name: "Choose your starter" })).toBeHidden();
    await expect(card.getByRole("group", { name: "Any food preferences?" })).toBeHidden();
    await card.getByLabel("Joyfully accepts").check();
    for (const course of ["starter", "main", "dessert"]) await expect(card.getByRole("group", { name: `Choose your ${course}` })).toBeVisible();
    await expect(card.getByRole("group", { name: "Choose your main" }).getByRole("radio")).toHaveCount(3);
    const dietary = card.getByRole("group", { name: "Any food preferences?" });
    await expect(dietary).toHaveAccessibleDescription("Tick any that apply, or leave blank if none. Only Olivia and James will see this.");
    await expect(dietary.getByLabel("Your other food preference")).toBeHidden();
    await card.getByLabel("Pan-roasted hake with lemon butter").check();
    await dietary.getByRole("checkbox", { name: "Other" }).check();
    await expect(dietary.getByLabel("Your other food preference")).toBeVisible();
    // Every option row is a full-width target at least 52px tall.
    for (const box of await card.locator(".rsvp-option").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(52);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`meal-choices-${theme}.png`), fullPage: true });
    // Declining hides every food question again; accepting restores the answers.
    await card.getByLabel("Regretfully declines").check();
    await expect(dietary).toBeHidden();
    await card.getByLabel("Joyfully accepts").check();
    await expect(card.getByLabel("Pan-roasted hake with lemon butter")).toBeChecked();
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} fits 320px`).toBe(true);
    if (viewport.width < 900) await card.screenshot({ path: test.info().outputPath(`meal-choices-${theme}-320.png`) });
  });
}
