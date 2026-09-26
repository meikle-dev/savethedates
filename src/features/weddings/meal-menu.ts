// F068: the couple's menu and a guest's food answers. Pure, so the rules are unit tested and shared by the workspace
// editor, the guest form and their server actions. The database enforces the same limits
// (supabase/migrations/20260926000100_rsvp_meal_choices.sql).

export const courses = ["starter", "main", "dessert"] as const;
export type Course = (typeof courses)[number];
export const courseWords: Record<Course, { title: string; one: string; many: string }> = {
  starter: { title: "Starter", one: "starter", many: "starters" },
  main: { title: "Main", one: "main", many: "mains" },
  dessert: { title: "Dessert", one: "dessert", many: "desserts" },
};
export const maxMealOptions = 6;
export const maxMealOptionLength = 80;
export const maxDietaryOtherLength = 200;

export type MealOption = { id: string; label: string };
export type MealMenu = Record<Course, MealOption[]>;

export const emptyMealMenu = (): MealMenu => ({ starter: [], main: [], dessert: [] });

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isOptionId = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Reads a stored, projected or submitted menu defensively. Malformed options are dropped, never invented. */
export function parseMealMenu(value: unknown): MealMenu {
  const source = record(value);
  const menu = emptyMealMenu();
  if (!source) return menu;
  for (const course of courses) {
    const options = source[course];
    if (!Array.isArray(options)) continue;
    menu[course] = options.slice(0, maxMealOptions).flatMap((option) => {
      const item = record(option);
      return item && isOptionId(item.id) && typeof item.label === "string" ? [{ id: item.id, label: item.label }] : [];
    });
  }
  return menu;
}

/** The courses guests are asked about: meal choices are on (a menu is given) and the course has options. */
export function shownCourses(menu: MealMenu | null): Course[] {
  return menu ? courses.filter((course) => menu[course].length >= 2) : [];
}

/** Only the courses guests see, so the guest form and its hidden copy of the menu carry nothing else. */
export function guestMenu(menu: MealMenu | null): MealMenu | null {
  if (!menu) return null;
  const shown = emptyMealMenu();
  for (const course of shownCourses(menu)) shown[course] = menu[course];
  return shownCourses(shown).length ? shown : null;
}

function listWords(words: string[]) {
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** The meal choices panel's introduction for the saved state. */
export function mealChoicesIntro(enabled: boolean, menu: MealMenu) {
  const shown = shownCourses(menu);
  if (!enabled || !shown.length) return "Guests who accept are asked about food preferences. Add a menu if you’d also like them to choose their meal.";
  return `Guests who accept choose their ${listWords(shown.map((course) => courseWords[course].one))}.`;
}

// ---- Workspace menu editor ----------------------------------------------------------------------------------------

/** An editor row: `id` is empty for an option that hasn't been saved yet. */
export type MealOptionDraft = { id: string; label: string };
export type MealMenuDraft = { enabled: boolean; menu: Record<Course, MealOptionDraft[]> };
export type MealMenuErrors = Record<string, string[] | undefined>;

/** Error keys: `enabled`, a course (`starter`) or one option (`starter.0`). */
export const optionErrorKey = (course: Course, index: number) => `${course}.${index}`;

/** Reads the editor's hidden JSON field. Invalid submissions are kept as far as possible so validation can explain them. */
export function mealMenuDraftFromForm(form: FormData): MealMenuDraft {
  const menu: MealMenuDraft["menu"] = { starter: [], main: [], dessert: [] };
  let submitted: Record<string, unknown> | null = null;
  try {
    submitted = record(JSON.parse(String(form.get("meal_menu") ?? "{}")));
  } catch {
    // An unreadable field is treated as an empty menu.
  }
  for (const course of courses) {
    const options = submitted?.[course];
    // Keep one more than the limit, so a forged longer list is rejected rather than silently shortened.
    if (Array.isArray(options)) menu[course] = options.slice(0, maxMealOptions + 1).map((option) => {
      const item = record(option);
      return { id: typeof item?.id === "string" ? item.id : "", label: typeof item?.label === "string" ? item.label.slice(0, 1000) : "" };
    });
  }
  return { enabled: form.get("meal_choices_enabled") === "on", menu };
}

/** Server-enforced menu rules. Labels are trimmed; the result keeps the submitted ids for `assignOptionIds`. */
export function validateMealMenu(draft: MealMenuDraft): { menu: Record<Course, MealOptionDraft[]>; errors: MealMenuErrors } {
  const errors: MealMenuErrors = {};
  const menu = { starter: [], main: [], dessert: [] } as Record<Course, MealOptionDraft[]>;
  for (const course of courses) {
    const { one, many } = courseWords[course];
    const seen = new Set<string>();
    menu[course] = draft.menu[course].map((option, index) => {
      const label = option.label.trim();
      const key = label.toLowerCase();
      if (!label) errors[optionErrorKey(course, index)] = ["Enter this option, or remove it."];
      else if (label.length > maxMealOptionLength) errors[optionErrorKey(course, index)] = ["Keep each option to 80 characters or fewer."];
      else if (seen.has(key)) errors[optionErrorKey(course, index)] = [`This option is already in your ${many}.`];
      seen.add(key);
      return { id: option.id, label };
    });
    const count = menu[course].length;
    if (count === 1) errors[course] = [`Add a second ${one} option, or remove this one to skip ${many}.`];
    else if (count > maxMealOptions) errors[course] = ["Six options is the most for one course."];
  }
  if (draft.enabled && !courses.some((course) => menu[course].length >= 2)) {
    errors.enabled = ["Add at least two options to one course, or switch meal choices off."];
  }
  return { menu, errors };
}

/**
 * Keeps an option's id while it stays in the same course of the saved menu (so renames and moves keep their identity)
 * and gives every new or unrecognised option a fresh id. A submitted id can never point at another course.
 */
export function assignOptionIds(menu: Record<Course, MealOptionDraft[]>, saved: MealMenu, newId: () => string): MealMenu {
  const result = emptyMealMenu();
  for (const course of courses) {
    const known = new Set(saved[course].map((option) => option.id));
    const used = new Set<string>();
    result[course] = menu[course].map((option) => {
      const id = known.has(option.id) && !used.has(option.id) ? option.id : newId();
      used.add(id);
      return { id, label: option.label };
    });
  }
  return result;
}

// ---- Guest answers ------------------------------------------------------------------------------------------------

export const dietaryChoices = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "other", label: "Other" },
] as const;
export type Dietary = (typeof dietaryChoices)[number]["value"];
const dietaryValues: readonly string[] = dietaryChoices.map(({ value }) => value);

/** A guest's food answers as submitted: option id per course, ticked requirements and the Other text. */
export type GuestFood = { meals: Partial<Record<Course, string>>; dietary: Dietary[]; other: string };
export const noFood = (): GuestFood => ({ meals: {}, dietary: [], other: "" });

export function guestFoodFromForm(form: FormData): GuestFood {
  const meals: GuestFood["meals"] = {};
  for (const course of courses) {
    const value = form.get(`meal_${course}`);
    if (typeof value === "string" && value) meals[course] = value.slice(0, 64);
  }
  const ticked = new Set(form.getAll("dietary").map(String));
  return {
    meals,
    dietary: dietaryChoices.map(({ value }) => value).filter((value) => ticked.has(value)),
    // Other's text counts only while Other is ticked; kept long enough to reject rather than truncate.
    other: ticked.has("other") ? String(form.get("dietary_other") ?? "").slice(0, 1000) : "",
  };
}

export function hasFood(food: GuestFood) {
  return Object.keys(food.meals).length > 0 || food.dietary.length > 0;
}

/** The menu the guest's page showed, from the form's hidden copy; null when it showed no courses. */
export function seenMenuFromForm(form: FormData): MealMenu | null {
  try {
    return guestMenu(parseMealMenu(JSON.parse(String(form.get("meal_menu") ?? "null"))));
  } catch {
    return null;
  }
}

export const mealErrorKey = (course: Course) => `meal_${course}`;
export const courseMissing = (course: Course) => `Choose a ${courseWords[course].one}.`;
export const courseChanged = (course: Course) => `The menu has changed. Choose your ${courseWords[course].one} again.`;
export const otherMissing = "Tell us your other food preference, or untick Other.";
export const otherTooLong = "Keep this to 200 characters or fewer.";
export const notAttendingCleared = "You’re not attending, so we’ve cleared your meal choices. Send your reply again.";
export const menuUpdated = "The couple has updated their menu. Please check your meal choices.";

/** Field errors for an attending guest's food answers, against the menu their page showed. */
export function guestFoodErrors(food: GuestFood, seen: MealMenu | null): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const course of shownCourses(seen)) if (!food.meals[course]) errors[mealErrorKey(course)] = [courseMissing(course)];
  if (food.dietary.includes("other")) {
    const other = food.other.trim();
    if (!other) errors.dietary_other = [otherMissing];
    else if (other.length > maxDietaryOtherLength) errors.dietary_other = [otherTooLong];
  }
  return errors;
}

/** The submission function's food arguments. Each choice carries the text the guest saw, so a renamed option is refused. */
export function foodArguments(food: GuestFood, seen: MealMenu | null) {
  const meals: Partial<Record<Course, MealOption>> = {};
  for (const course of courses) {
    const id = food.meals[course];
    if (id) meals[course] = { id, label: seen?.[course].find((option) => option.id === id)?.label ?? "" };
  }
  return {
    requested_meals: meals,
    requested_vegetarian: food.dietary.includes("vegetarian"),
    requested_vegan: food.dietary.includes("vegan"),
    requested_gluten_free: food.dietary.includes("gluten_free"),
    requested_dietary_other: food.dietary.includes("other") ? food.other.trim() : null,
  };
}

function sameMenu(a: MealMenu | null, b: MealMenu | null) {
  return JSON.stringify(guestMenu(a)) === JSON.stringify(guestMenu(b));
}

/**
 * After the database refused the meal choices, re-check them against the current menu: keep the choices that are
 * still valid (same option, same text), clear the rest and explain each course that needs a new answer.
 */
export function reconcileMeals(food: GuestFood, seen: MealMenu | null, current: MealMenu | null) {
  const meals: GuestFood["meals"] = {};
  const errors: Record<string, string[]> = {};
  const seenCourses = shownCourses(seen);
  for (const course of shownCourses(current)) {
    const id = food.meals[course];
    const seenLabel = seen?.[course].find((option) => option.id === id)?.label;
    if (id && seenLabel !== undefined && current![course].some((option) => option.id === id && option.label === seenLabel)) meals[course] = id;
    else errors[mealErrorKey(course)] = [!id && seenCourses.includes(course) ? courseMissing(course) : courseChanged(course)];
  }
  return { meals, errors, changed: !sameMenu(seen, current) };
}

/** The confirmation's "Your choices" lines, built from the accepted submission. */
export function choiceSummary(food: GuestFood, seen: MealMenu | null) {
  const meals = shownCourses(seen).flatMap((course) => {
    const label = seen![course].find((option) => option.id === food.meals[course])?.label;
    return label ? [`${courseWords[course].title}: ${label}`] : [];
  });
  return [...meals, `Dietary: ${dietaryText(food.dietary, food.other.trim(), "none")}`];
}

/** "Vegan, Other (no mushrooms)", or `none` when nothing was ticked. */
export function dietaryText(dietary: readonly Dietary[], other: string | null, none: string, quoteOther = false) {
  const parts = dietary.filter((value) => dietaryValues.includes(value)).map((value) => {
    if (value !== "other") return dietaryChoices.find((choice) => choice.value === value)!.label;
    return quoteOther ? `Other: “${other}”` : `Other (${other})`;
  });
  return parts.length ? parts.join(", ") : none;
}
