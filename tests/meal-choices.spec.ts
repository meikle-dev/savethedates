import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

// F068: the couple's menu editor, guest replies with and without meal choices, and Guests' catering numbers.
const local = localSupabase();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const menu = {
  starter: [{ id: id(1), label: "Leek and potato soup" }, { id: id(2), label: "Smoked salmon with wheaten bread" }],
  main: [{ id: id(3), label: "Roast sirloin of beef" }, { id: id(4), label: "Pan-roasted hake" }, { id: id(5), label: "Wild mushroom risotto" }],
  dessert: [],
};

async function liveWedding(values: Record<string, unknown> = {}) {
  const email = `meals-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create meal choices test owner");
  const ownerId = created.data.user.id;
  const slug = `meals-${crypto.randomUUID().slice(0, 8)}`;
  const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, rsvp_enabled: true, ...values }).select("id, rsvp_share_secret").single();
  expect(wedding.error).toBeNull();
  expect((await local.grantEntitlement(wedding.data!.id, ownerId)).error).toBeNull();
  expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data!.id)).error).toBeNull();
  return { email, password, ownerId, weddingId: wedding.data!.id as string, rsvp: `/${slug}/${wedding.data!.rsvp_share_secret}/rsvp` };
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/account/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

const replies = async (weddingId: string) => (await local.admin.from("shared_rsvp_responses")
  .select("responding_name, attending, meal_choices, dietary_vegetarian, dietary_vegan, dietary_gluten_free, dietary_other")
  .eq("wedding_id", weddingId).order("responded_at")).data!;

test("couples build, validate, reorder and switch on their menu", async ({ page }) => {
  const owner = await liveWedding();
  try {
    await signIn(page, owner.email, owner.password);
    await openWorkspaceSection(page, "RSVP");
    const panel = page.getByRole("region", { name: "Meal choices" });
    await expect(panel.getByText("Off", { exact: true })).toBeVisible();
    await expect(panel).toContainText("Guests who accept are asked about food preferences. Add a menu if you’d also like them to choose their meal.");
    await expect(panel).toContainText("No starter options. Guests won’t be asked about starters.");

    // Switching on with no course filled is refused, and focus moves to the switch.
    const toggle = panel.getByLabel("Ask guests to choose their meal");
    await toggle.check();
    await panel.getByRole("button", { name: "Save meal choices" }).click();
    await expect(panel.getByRole("alert")).toHaveText("Check the meal choices marked below.");
    await expect(panel.getByText("Add at least two options to one course, or switch meal choices off.")).toBeVisible();
    await expect(toggle).toBeFocused();

    // A new course starts with two rows and focuses the first.
    await panel.getByRole("button", { name: "Add starter options" }).click();
    await expect(panel.getByRole("textbox", { name: "Starter Option 1", exact: true })).toBeFocused();
    await panel.getByRole("textbox", { name: "Starter Option 1", exact: true }).fill("Smoked salmon");
    await panel.getByRole("textbox", { name: "Starter Option 2", exact: true }).fill("Leek and potato soup");
    await panel.getByRole("button", { name: "Add another starter option" }).click();
    await expect(panel.getByRole("textbox", { name: "Starter Option 3", exact: true })).toBeFocused();
    await panel.getByRole("textbox", { name: "Starter Option 3", exact: true }).fill(" smoked SALMON ");
    // One dessert option isn't a choice.
    await panel.getByRole("button", { name: "Add dessert options" }).click();
    await panel.getByRole("textbox", { name: "Dessert Option 1", exact: true }).fill("Sticky toffee pudding");
    await panel.getByRole("button", { name: "Save meal choices" }).click();
    await expect(panel.getByText("This option is already in your starters.")).toBeVisible();
    await expect(panel.getByText("Enter this option, or remove it.")).toBeVisible();
    await expect(panel.getByRole("textbox", { name: "Starter Option 3", exact: true })).toBeFocused();
    await expect(panel.getByRole("group", { name: "Starter" })).not.toHaveAttribute("aria-invalid", "true");

    // Remove: focus moves to the previous row when there is no next one.
    await panel.getByRole("button", { name: "Remove starter option 3" }).click();
    await expect(panel.getByRole("textbox", { name: "Starter Option 2", exact: true })).toBeFocused();
    await expect(panel.getByRole("status").filter({ hasText: "Option removed." })).toBeAttached();
    // Move: the moved row keeps focus; at the top, focus goes to its other move button.
    await panel.getByRole("button", { name: "Move starter option 2 up" }).click();
    await expect(panel.getByRole("textbox", { name: "Starter Option 1", exact: true })).toHaveValue("Leek and potato soup");
    await expect(panel.getByRole("button", { name: "Move starter option 1 down" })).toBeFocused();
    await expect(panel.getByRole("button", { name: "Move starter option 1 up" })).toBeDisabled();
    await expect(panel.getByRole("status").filter({ hasText: "Moved to position 1 of 2." })).toBeAttached();

    await panel.getByRole("button", { name: "Remove dessert option 2" }).click();
    await panel.getByRole("button", { name: "Save meal choices" }).click();
    await expect(panel.getByText("Add a second dessert option, or remove this one to skip desserts.")).toBeVisible();
    await expect(panel.getByRole("group", { name: "Dessert" })).toHaveAttribute("aria-invalid", "true");
    await panel.getByRole("button", { name: "Remove dessert option 1" }).click();
    await expect(panel.getByRole("button", { name: "Add dessert options" })).toBeFocused();

    await panel.getByRole("button", { name: "Add main options" }).click();
    for (const [index, label] of ["Roast beef", "Hake", "Risotto"].entries()) {
      if (index === 2) await panel.getByRole("button", { name: "Add another main option" }).click();
      await panel.getByRole("textbox", { name: `Main Option ${index + 1}`, exact: true }).fill(label);
    }
    await expect(panel.getByText("Save to apply your changes.")).toBeVisible();
    await panel.getByRole("button", { name: "Save meal choices" }).click();
    await expect(panel.getByRole("status").filter({ hasText: "Meal choices saved." })).toContainText("Guests who accept choose their starter and main.");
    await expect(panel.getByText("On", { exact: true })).toBeVisible();
    const saved = (await local.admin.from("weddings").select("meal_choices_enabled, meal_menu").eq("id", owner.weddingId).single()).data!;
    expect(saved.meal_choices_enabled).toBe(true);
    expect(saved.meal_menu.starter.map((option: { label: string }) => option.label)).toEqual(["Leek and potato soup", "Smoked salmon"]);
    expect(saved.meal_menu.main.map((option: { label: string }) => option.label)).toEqual(["Roast beef", "Hake", "Risotto"]);
    expect(saved.meal_menu.dessert).toEqual([]);
    await page.reload();
    await expect(panel.getByRole("textbox", { name: "Main Option 2", exact: true })).toHaveValue("Hake");
    // Renaming keeps the option's id.
    await panel.getByRole("textbox", { name: "Main Option 2", exact: true }).fill("Pan-roasted hake");
    await panel.getByRole("button", { name: "Save meal choices" }).click();
    await expect(panel.getByRole("status").filter({ hasText: "Meal choices saved." })).toBeVisible();
    const renamed = (await local.admin.from("weddings").select("meal_menu").eq("id", owner.weddingId).single()).data!.meal_menu;
    expect(renamed.main[1]).toEqual({ id: saved.meal_menu.main[1].id, label: "Pan-roasted hake" });

    await panel.screenshot({ path: test.info().outputPath("meal-editor.png") });
    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await panel.screenshot({ path: test.info().outputPath("meal-editor-320.png") });

    // Switching off hides the menu from guests but keeps it.
    await toggle.uncheck();
    await panel.getByRole("button", { name: "Save meal choices" }).click();
    await expect(panel.getByRole("status").filter({ hasText: "Meal choices saved." })).toContainText("Add a menu if you’d also like them to choose their meal.");
    expect((await local.admin.from("weddings").select("meal_choices_enabled, meal_menu").eq("id", owner.weddingId).single()).data).toEqual({ meal_choices_enabled: false, meal_menu: renamed });
  } finally {
    await local.admin.auth.admin.deleteUser(owner.ownerId);
  }
});

test("guests who accept choose their meals and food preferences; a No stores neither", async ({ page }) => {
  const owner = await liveWedding({ meal_choices_enabled: true, meal_menu: menu });
  try {
    await page.goto(owner.rsvp);
    const card = page.getByRole("region", { name: "Invitation response" });
    await expect(card.getByRole("group", { name: "Choose your starter" })).toBeHidden();
    await card.getByLabel("Your name").fill("Sam Jones");
    await card.getByLabel("Joyfully accepts").check();
    await expect(card.getByRole("group", { name: "Choose your dessert" })).toHaveCount(0);
    await card.getByLabel("Leek and potato soup").check();
    const dietary = card.getByRole("group", { name: "Any food preferences?" });
    await dietary.getByLabel("Vegan").check();
    await dietary.getByRole("checkbox", { name: "Other" }).check();
    await card.getByRole("button", { name: "Send RSVP" }).click();
    // Each missing answer is explained and focus moves to the first invalid control.
    await expect(card.getByRole("alert")).toHaveText("Check the highlighted fields.");
    await expect(card.getByText("Choose a main.")).toBeVisible();
    await expect(card.getByText("Tell us your other food preference, or untick Other.")).toBeVisible();
    await expect(card.getByRole("group", { name: "Choose your main" })).toHaveAttribute("aria-invalid", "true");
    await expect(card.getByLabel("Roast sirloin of beef")).toBeFocused();
    await expect(card.getByLabel("Leek and potato soup")).toBeChecked();
    await expect(card.getByLabel("Your name")).toHaveValue("Sam Jones");
    await page.screenshot({ path: test.info().outputPath("meal-guest-errors.png"), fullPage: true });
    await card.getByLabel("Pan-roasted hake").check();
    await dietary.getByLabel("Your other food preference").fill("no mushrooms");
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("heading", { name: "Thank you" })).toBeFocused();
    const choices = card.getByRole("list");
    await expect(choices.getByRole("listitem")).toHaveText(["Starter: Leek and potato soup", "Main: Pan-roasted hake", "Dietary: Vegan, Other (no mushrooms)"]);
    await page.screenshot({ path: test.info().outputPath("meal-guest-success.png"), fullPage: true });

    // A guest who picks meals and then declines sends no food answers.
    await card.getByRole("button", { name: "Reply for someone else" }).click();
    await card.getByLabel("Your name").fill("Jordan Lee");
    await card.getByLabel("Joyfully accepts").check();
    await card.getByLabel("Roast sirloin of beef").check();
    await dietary.getByLabel("Vegetarian").check();
    await card.getByLabel("Regretfully declines").check();
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("status")).toContainText("We’ve saved Jordan Lee’s reply: regretfully declines.");
    await expect(card.getByText("Your choices")).toHaveCount(0);

    expect(await replies(owner.weddingId)).toEqual([
      { responding_name: "Sam Jones", attending: true, meal_choices: { starter: menu.starter[0], main: menu.main[1] }, dietary_vegetarian: false, dietary_vegan: true, dietary_gluten_free: false, dietary_other: "no mushrooms" },
      { responding_name: "Jordan Lee", attending: false, meal_choices: {}, dietary_vegetarian: false, dietary_vegan: false, dietary_gluten_free: false, dietary_other: null },
    ]);
  } finally {
    await local.admin.auth.admin.deleteUser(owner.ownerId);
  }
});

test("a menu changed while the page was open is re-shown with valid answers kept", async ({ page }) => {
  const owner = await liveWedding({ meal_choices_enabled: true, meal_menu: menu });
  try {
    await page.goto(owner.rsvp);
    const card = page.getByRole("region", { name: "Invitation response" });
    await card.getByLabel("Your name").fill("Robin Hale");
    await card.getByLabel("Joyfully accepts").check();
    await card.getByLabel("Smoked salmon with wheaten bread").check();
    await card.getByLabel("Pan-roasted hake").check();
    await card.getByLabel("Gluten-free").check();
    // The couple renames the hake while the guest's page is open.
    const changed = { ...menu, main: [menu.main[0], { id: id(4), label: "Hake with lemon butter" }, menu.main[2]] };
    expect((await local.admin.from("weddings").update({ meal_menu: changed }).eq("id", owner.weddingId)).error).toBeNull();
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("alert")).toHaveText("The couple has updated their menu. Please check your meal choices.");
    await expect(card.getByText("The menu has changed. Choose your main again.")).toBeVisible();
    await expect(card.getByLabel("Hake with lemon butter")).not.toBeChecked();
    await expect(card.getByLabel("Smoked salmon with wheaten bread")).toBeChecked();
    await expect(card.getByLabel("Gluten-free")).toBeChecked();
    await expect(card.getByLabel("Your name")).toHaveValue("Robin Hale");
    await expect(card.getByLabel("Roast sirloin of beef")).toBeFocused();
    expect(await replies(owner.weddingId)).toEqual([]);
    await card.getByLabel("Hake with lemon butter").check();
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("list").getByRole("listitem")).toHaveText(["Starter: Smoked salmon with wheaten bread", "Main: Hake with lemon butter", "Dietary: Gluten-free"]);
    expect((await replies(owner.weddingId))[0].meal_choices).toEqual({ starter: menu.starter[1], main: changed.main[1] });
  } finally {
    await local.admin.auth.admin.deleteUser(owner.ownerId);
  }
});

// Review fix: a browser can restore "Joyfully accepts" (reload form restoration, back/forward cache) without firing a
// change event. The questions must then be usable, not visible but disabled.
test("a restored Joyfully accepts leaves the food questions usable", async ({ page }) => {
  const owner = await liveWedding({ meal_choices_enabled: true, meal_menu: menu });
  try {
    await page.goto(owner.rsvp);
    const card = page.getByRole("region", { name: "Invitation response" });
    await expect(card.getByLabel("Vegan")).toBeDisabled(); // hydrated: hidden questions are disabled
    await card.getByLabel("Your name").fill("Remy Stone");
    await page.evaluate(() => {
      (document.querySelector('input[name="attending"][value="yes"]') as HTMLInputElement).checked = true;
      dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    await expect(card.getByLabel("Vegan")).toBeEnabled();
    await card.getByLabel("Leek and potato soup").check();
    await card.getByLabel("Wild mushroom risotto").check();
    await card.getByLabel("Vegan").check();
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("list").getByRole("listitem")).toHaveText(["Starter: Leek and potato soup", "Main: Wild mushroom risotto", "Dietary: Vegan"]);
    expect((await replies(owner.weddingId)).map(({ attending, dietary_vegan }) => ({ attending, dietary_vegan }))).toEqual([{ attending: true, dietary_vegan: true }]);
  } finally {
    await local.admin.auth.admin.deleteUser(owner.ownerId);
  }
});

test("with meal choices off, guests who accept give food preferences only", async ({ page }) => {
  // A menu prepared but switched off is never shown.
  const owner = await liveWedding({ meal_menu: menu });
  try {
    await page.goto(owner.rsvp);
    const card = page.getByRole("region", { name: "Invitation response" });
    await card.getByLabel("Your name").fill("Casey Park");
    await card.getByLabel("Joyfully accepts").check();
    await expect(card.getByRole("group", { name: /Choose your/ })).toHaveCount(0);
    await expect(card.locator("input[name=meal_menu]")).toHaveCount(0);
    await card.getByLabel("Vegetarian").check();
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("list").getByRole("listitem")).toHaveText(["Dietary: Vegetarian"]);
    // No requirements ticked means none.
    await card.getByRole("button", { name: "Reply for someone else" }).click();
    await card.getByLabel("Your name").fill("Drew Park");
    await card.getByLabel("Joyfully accepts").check();
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("list").getByRole("listitem")).toHaveText(["Dietary: none"]);
    expect((await replies(owner.weddingId)).map(({ responding_name, meal_choices, dietary_vegetarian }) => ({ responding_name, meal_choices, dietary_vegetarian }))).toEqual([
      { responding_name: "Casey Park", meal_choices: {}, dietary_vegetarian: true },
      { responding_name: "Drew Park", meal_choices: {}, dietary_vegetarian: false },
    ]);
  } finally {
    await local.admin.auth.admin.deleteUser(owner.ownerId);
  }
});

// The CSS reveal works before hydration and without JavaScript. Without JavaScript a guest can switch to "No" after
// choosing meals, and the browser then sends them; re-enabling the hidden questions reproduces that submission.
// (A real no-JavaScript POST from a guest page is currently refused by Next.js before reaching the action: the guest
// pages' Referrer-Policy: no-referrer makes the browser send Origin: null. Recorded in the F068 handoff.)
test("a No sent with meal choices is refused, keeps the No and clears the food answers", async ({ browser, baseURL }) => {
  const owner = await liveWedding({ meal_choices_enabled: true, meal_menu: menu });
  const noScript = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const context = await browser.newContext({ baseURL });
  try {
    const plain = await noScript.newPage();
    await plain.goto(owner.rsvp);
    const plainCard = plain.getByRole("region", { name: "Invitation response" });
    await plainCard.getByLabel("Joyfully accepts").check();
    await expect(plainCard.getByRole("group", { name: "Choose your starter" })).toBeVisible();
    await expect(plainCard.getByRole("group", { name: "Any food preferences?" })).toBeVisible();
    await plainCard.getByLabel("Regretfully declines").check();
    await expect(plainCard.getByRole("group", { name: "Choose your starter" })).toBeHidden();

    const page = await context.newPage();
    await page.goto(owner.rsvp);
    const card = page.getByRole("region", { name: "Invitation response" });
    await card.getByLabel("Your name").fill("Nell Grey");
    await card.getByLabel("Joyfully accepts").check();
    await card.getByLabel("Leek and potato soup").check();
    await card.getByLabel("Vegetarian").check();
    await card.getByLabel("Regretfully declines").check();
    // Once hydrated, the hidden questions are disabled so a "No" sends nothing.
    await expect(card.getByLabel("Leek and potato soup")).toBeDisabled();
    await expect(card.getByLabel("Vegetarian")).toBeDisabled();
    await card.locator("fieldset:disabled").evaluateAll((sets) => sets.forEach((set) => set.removeAttribute("disabled")));
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("alert")).toHaveText("You’re not attending, so we’ve cleared your meal choices. Send your reply again.");
    await expect(card.getByLabel("Regretfully declines")).toBeChecked();
    await expect(card.getByLabel("Your name")).toHaveValue("Nell Grey");
    await card.getByLabel("Joyfully accepts").check();
    await expect(card.getByLabel("Leek and potato soup")).not.toBeChecked();
    await expect(card.getByLabel("Vegetarian")).not.toBeChecked();
    await card.getByLabel("Regretfully declines").check();
    expect(await replies(owner.weddingId)).toEqual([]);
    await card.getByRole("button", { name: "Send RSVP" }).click();
    await expect(card.getByRole("status")).toContainText("We’ve saved Nell Grey’s reply: regretfully declines.");
    expect((await replies(owner.weddingId)).map(({ attending, meal_choices, dietary_vegetarian }) => ({ attending, meal_choices, dietary_vegetarian }))).toEqual([{ attending: false, meal_choices: {}, dietary_vegetarian: false }]);
  } finally {
    await noScript.close();
    await context.close();
    await local.admin.auth.admin.deleteUser(owner.ownerId);
  }
});

test("Guests shows each reply's answers and catering numbers across every attending reply", async ({ page }) => {
  const renamed = { ...menu, main: [menu.main[0], { id: id(4), label: "Hake with lemon butter" }, menu.main[2]] };
  const owner = await liveWedding({ meal_choices_enabled: true, meal_menu: renamed });
  try {
    const base = Date.parse("2026-09-01T12:00:00Z");
    const row = (n: number, values: Record<string, unknown>) => ({ wedding_id: owner.weddingId, responded_at: new Date(base + n * 60_000).toISOString(), attending: true, ...values });
    const seeded = [
      row(1, { responding_name: "Older Reply" }),
      row(2, { responding_name: "Sam Jones", meal_choices: { starter: menu.starter[0], main: menu.main[1] }, dietary_vegan: true, dietary_other: "no mushrooms" }),
      row(3, { responding_name: "Pat Kim", meal_choices: { starter: menu.starter[0], main: menu.main[0] }, dietary_gluten_free: true, dietary_vegan: true }),
      row(4, { responding_name: "Lee Ray", meal_choices: { starter: menu.starter[1] } }),
      row(5, { responding_name: "Not Coming", attending: false }),
      ...Array.from({ length: 11 }, (_, n) => row(10 + n, { responding_name: `Other ${String(n + 1).padStart(2, "0")}`, meal_choices: { starter: menu.starter[1], main: menu.main[2] }, dietary_other: `need ${n + 1}` })),
    ];
    expect((await local.admin.from("shared_rsvp_responses").insert(seeded, { defaultToNull: false })).error).toBeNull();
    await signIn(page, owner.email, owner.password);
    // The numbers ignore the filter, search and page.
    await page.goto("/dashboard/guests?filter=not-attending&q=Not");
    const catering = page.getByRole("region", { name: "Catering numbers" });
    await expect(catering).toContainText("From 15 attending guests. Replies from guests who aren’t attending aren’t counted.");
    const count = (block: string, label: string) => catering.getByRole("region", { name: block }).locator(".catering-list > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
    await expect(count("Starter", "Leek and potato soup")).toHaveText("2");
    await expect(count("Starter", "Smoked salmon with wheaten bread")).toHaveText("12");
    await expect(count("Starter", "No choice")).toHaveText("1");
    await expect(count("Main", "Roast sirloin of beef")).toHaveText("1");
    await expect(count("Main", "Hake with lemon butter")).toHaveText("0");
    await expect(count("Main", "Wild mushroom risotto")).toHaveText("11");
    await expect(count("Main", "No longer on the menu")).toHaveText("1");
    await expect(count("Main", "No choice")).toHaveText("2");
    await expect(count("Food preferences", "Vegan")).toHaveText("2");
    await expect(count("Food preferences", "Gluten-free")).toHaveText("1");
    await expect(count("Food preferences", "Other")).toHaveText("12");
    await expect(catering).toContainText("“no mushrooms” — Sam Jones");
    await expect(catering.getByText("“need 11” — Other 11")).toBeHidden();
    await catering.getByText("Show all 12 other preferences").click();
    await expect(catering.getByText("“need 11” — Other 11")).toBeVisible();
    await catering.screenshot({ path: test.info().outputPath("meal-catering.png") });

    await page.goto("/dashboard/guests?q=Sam");
    const list = page.getByRole("region", { name: "Guest responses" });
    const sam = list.locator(".guest-row").filter({ hasText: "Sam Jones" });
    await expect(sam.locator(".guest-food")).toContainText("Starter: Leek and potato soup");
    await expect(sam.locator(".guest-food")).toContainText("Main: Pan-roasted hake (no longer on the menu)");
    await expect(sam.locator(".guest-food em")).toHaveText("(no longer on the menu)");
    await expect(sam.locator(".guest-food")).toContainText("Dietary: Vegan, Other: “no mushrooms”");
    await page.goto("/dashboard/guests?q=Older");
    await expect(list.locator(".guest-row .guest-food")).toHaveText(/No meal choice.*Dietary:\s*none given/);
    await page.goto("/dashboard/guests?q=Lee");
    await expect(list.locator(".guest-row .guest-food")).toContainText("Main: no choice");
    await page.goto("/dashboard/guests");
    await expect(list.locator(".guest-row").filter({ hasText: "Not Coming" }).locator(".guest-food")).toHaveCount(0);
    await list.screenshot({ path: test.info().outputPath("meal-guest-list.png") });

    // Correcting to Not attending removes the food answers, and says so.
    await page.goto("/dashboard/guests?q=Sam");
    await list.getByRole("button", { name: "Correct or remove response from Sam Jones" }).click();
    const panel = list.locator(".guest-panel").first();
    await expect(panel.getByRole("group", { name: "Attendance" })).toHaveAccessibleDescription("Changing to Not attending also removes their meal choices and food preferences.");
    await expect(panel).toContainText("To change a meal choice or food preference, ask the guest to send a new reply, then remove this one.");
    await panel.getByLabel("Not attending").check();
    await panel.getByRole("button", { name: "Save correction" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Response corrected. Their meal choices and food preferences were removed." }).first()).toBeAttached();
    const sams = (await replies(owner.weddingId)).find((reply) => reply.responding_name === "Sam Jones");
    expect(sams).toMatchObject({ attending: false, meal_choices: {}, dietary_vegan: false, dietary_other: null });
    await expect(catering).toContainText("From 14 attending guests.");
  } finally {
    await local.admin.auth.admin.deleteUser(owner.ownerId);
  }
});
