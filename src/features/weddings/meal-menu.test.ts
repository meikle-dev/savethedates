import { describe, expect, it } from "vitest";
import {
  assignOptionIds,
  choiceSummary,
  courseChanged,
  courseMissing,
  foodArguments,
  guestFoodErrors,
  guestFoodFromForm,
  guestMenu,
  hasFood,
  mealChoicesIntro,
  mealMenuDraftFromForm,
  otherMissing,
  parseMealMenu,
  reconcileMeals,
  seenMenuFromForm,
  shownCourses,
  validateMealMenu,
  type MealMenu,
} from "./meal-menu";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const menu: MealMenu = {
  starter: [{ id: id(1), label: "Soup" }, { id: id(2), label: "Salmon" }],
  main: [{ id: id(3), label: "Beef" }, { id: id(4), label: "Hake" }, { id: id(5), label: "Risotto" }],
  dessert: [],
};

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

function editorForm(enabled: boolean, courses: Record<string, unknown>) {
  return form([["meal_menu", JSON.stringify(courses)], ...(enabled ? [["meal_choices_enabled", "on"] as [string, string]] : [])]);
}

describe("menu editor validation", () => {
  it("accepts empty courses, 2–6 options and trims labels", () => {
    const draft = mealMenuDraftFromForm(editorForm(true, { starter: [{ id: "", label: "  Soup " }, { id: "", label: "Salad" }], main: [], dessert: [] }));
    const { menu: valid, errors } = validateMealMenu(draft);
    expect(errors).toEqual({});
    expect(valid.starter.map((option) => option.label)).toEqual(["Soup", "Salad"]);
    expect(draft.enabled).toBe(true);
  });

  it("explains a single option, blanks, duplicates, long options and too many options", () => {
    const { errors } = validateMealMenu(mealMenuDraftFromForm(editorForm(false, {
      starter: [{ id: "", label: "Soup" }],
      main: [{ id: "", label: "Beef" }, { id: "", label: " beef " }, { id: "", label: "" }, { id: "", label: "x".repeat(81) }],
      dessert: Array.from({ length: 7 }, (_, n) => ({ id: "", label: `Pudding ${n}` })),
    })));
    expect(errors.starter).toEqual(["Add a second starter option, or remove this one to skip starters."]);
    expect(errors["main.1"]).toEqual(["This option is already in your mains."]);
    expect(errors["main.2"]).toEqual(["Enter this option, or remove it."]);
    expect(errors["main.3"]).toEqual(["Keep each option to 80 characters or fewer."]);
    expect(errors.dessert).toEqual(["Six options is the most for one course."]);
    expect(errors.enabled).toBeUndefined();
  });

  it("needs a filled course before meal choices can be switched on, but allows preparing a menu while off", () => {
    expect(validateMealMenu(mealMenuDraftFromForm(editorForm(true, { starter: [], main: [], dessert: [] }))).errors.enabled)
      .toEqual(["Add at least two options to one course, or switch meal choices off."]);
    expect(validateMealMenu(mealMenuDraftFromForm(editorForm(false, { starter: [], main: [], dessert: [] }))).errors).toEqual({});
    expect(validateMealMenu(mealMenuDraftFromForm(form([["meal_menu", "not json"], ["meal_choices_enabled", "on"]]))).errors.enabled).toBeDefined();
  });

  it("keeps ids only within the same saved course and gives new or foreign options fresh ids", () => {
    let next = 100;
    const result = assignOptionIds({
      starter: [{ id: id(2), label: "Salmon, renamed" }, { id: "", label: "Pâté" }, { id: id(3), label: "Beef as starter" }, { id: id(2), label: "Copy" }],
      main: [{ id: id(3), label: "Beef" }, { id: "forged", label: "Lamb" }],
      dessert: [],
    }, menu, () => id(next++));
    expect(result.starter.map((option) => option.id)).toEqual([id(2), id(100), id(101), id(102)]);
    expect(result.main.map((option) => option.id)).toEqual([id(3), id(103)]);
  });

  it("describes the saved state", () => {
    expect(mealChoicesIntro(false, menu)).toBe("Guests who accept are asked about food preferences. Add a menu if you’d also like them to choose their meal.");
    expect(mealChoicesIntro(true, menu)).toBe("Guests who accept choose their starter and main.");
    expect(mealChoicesIntro(true, { ...menu, dessert: [{ id: id(6), label: "Pudding" }, { id: id(7), label: "Posset" }] })).toBe("Guests who accept choose their starter, main and dessert.");
  });
});

describe("guest food answers", () => {
  it("reads only known dietary values and ignores Other text unless Other is ticked", () => {
    const food = guestFoodFromForm(form([["meal_starter", id(1)], ["dietary", "vegan"], ["dietary", "halal"], ["dietary_other", "no mushrooms"]]));
    expect(food).toEqual({ meals: { starter: id(1) }, dietary: ["vegan"], other: "" });
    expect(guestFoodFromForm(form([["dietary", "other"], ["dietary_other", " no mushrooms "]])).other).toBe(" no mushrooms ");
    expect(hasFood(guestFoodFromForm(form([])))).toBe(false);
  });

  it("requires one choice per shown course and text for Other", () => {
    const errors = guestFoodErrors({ meals: { starter: id(1) }, dietary: ["other"], other: "   " }, menu);
    expect(errors).toEqual({ meal_main: [courseMissing("main")], dietary_other: [otherMissing] });
    expect(guestFoodErrors({ meals: {}, dietary: ["other"], other: "x".repeat(201) }, null).dietary_other).toEqual(["Keep this to 200 characters or fewer."]);
    expect(guestFoodErrors({ meals: {}, dietary: [], other: "" }, null)).toEqual({});
  });

  it("sends each choice with the text the guest saw, and Other only when ticked", () => {
    expect(foodArguments({ meals: { starter: id(2), main: id(999) }, dietary: ["vegetarian", "other"], other: " no pork " }, menu)).toEqual({
      requested_meals: { starter: { id: id(2), label: "Salmon" }, main: { id: id(999), label: "" } },
      requested_vegetarian: true, requested_vegan: false, requested_gluten_free: false, requested_dietary_other: "no pork",
    });
    expect(foodArguments({ meals: {}, dietary: [], other: "" }, null).requested_dietary_other).toBeNull();
  });

  it("reads the menu the page showed, keeping only shown courses", () => {
    expect(seenMenuFromForm(form([["meal_menu", JSON.stringify(menu)]]))).toEqual(menu);
    expect(seenMenuFromForm(form([["meal_menu", "{"]]))).toBeNull();
    expect(seenMenuFromForm(form([]))).toBeNull();
    expect(guestMenu({ starter: [{ id: id(1), label: "Soup" }], main: [], dessert: [] })).toBeNull();
    expect(shownCourses(parseMealMenu({ starter: [{ id: "bad", label: "x" }, { id: id(1), label: "Soup" }] }))).toEqual([]);
  });

  it("keeps still-valid choices and explains changed courses after the couple edits the menu", () => {
    const current: MealMenu = {
      starter: [{ id: id(1), label: "Soup of the day" }, { id: id(2), label: "Salmon" }],
      main: [{ id: id(4), label: "Hake" }, { id: id(5), label: "Risotto" }],
      dessert: [{ id: id(6), label: "Pudding" }, { id: id(7), label: "Posset" }],
    };
    const result = reconcileMeals({ meals: { starter: id(1), main: id(4) }, dietary: [], other: "" }, menu, current);
    expect(result.meals).toEqual({ main: id(4) });
    expect(result.errors).toEqual({ meal_starter: [courseChanged("starter")], meal_dessert: [courseChanged("dessert")] });
    expect(result.changed).toBe(true);
    // Unchanged menu, course left unanswered: the ordinary "Choose a …" message.
    const same = reconcileMeals({ meals: { main: id(3) }, dietary: [], other: "" }, menu, menu);
    expect(same).toEqual({ meals: { main: id(3) }, errors: { meal_starter: [courseMissing("starter")] }, changed: false });
    // Meal choices switched off: every choice is cleared and no course is asked about.
    expect(reconcileMeals({ meals: { main: id(3) }, dietary: [], other: "" }, menu, null)).toEqual({ meals: {}, errors: {}, changed: true });
  });

  it("summarises an accepted reply from the submission", () => {
    expect(choiceSummary({ meals: { starter: id(1), main: id(4) }, dietary: ["vegan", "other"], other: " no mushrooms " }, menu))
      .toEqual(["Starter: Soup", "Main: Hake", "Dietary: Vegan, Other (no mushrooms)"]);
    expect(choiceSummary({ meals: {}, dietary: [], other: "" }, null)).toEqual(["Dietary: none"]);
  });
});
