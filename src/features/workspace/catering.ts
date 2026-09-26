// F068: catering numbers and per-reply food lines for Guests. Pure, so the counting rules are unit tested.
import { courses, courseWords, dietaryChoices, shownCourses, type Course, type Dietary, type MealMenu } from "../weddings/meal-menu";
import type { ResponseFood } from "../weddings/rsvp";

/** Aggregates over every attending reply, from `rsvp_catering_summary` (owner-only under RLS). */
export type CateringSummary = {
  attending: number;
  meals: { course: Course; id: string; label: string; count: number }[];
  vegetarian: number;
  vegan: number;
  gluten_free: number;
  other: { name: string; text: string }[];
};

const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

export function parseCateringSummary(value: unknown): CateringSummary {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const meals = Array.isArray(source.meals) ? source.meals : [];
  const other = Array.isArray(source.other) ? source.other : [];
  return {
    attending: count(source.attending),
    meals: meals.flatMap((item) => item && courses.includes(item.course) && typeof item.id === "string" && typeof item.label === "string"
      ? [{ course: item.course as Course, id: item.id, label: item.label, count: count(item.count) }] : []),
    vegetarian: count(source.vegetarian),
    vegan: count(source.vegan),
    gluten_free: count(source.gluten_free),
    other: other.flatMap((item) => item && typeof item.name === "string" && typeof item.text === "string" ? [{ name: item.name, text: item.text }] : []),
  };
}

/** Whether a choice still matches the saved menu: same option and the same text. A rename counts as changed. */
export function onMenu(menu: MealMenu, course: Course, choice: { id: string; label: string }) {
  return menu[course].some((option) => option.id === choice.id && option.label === choice.label);
}

/** Meal lines appear while meal choices are on, or once any attending reply has a meal choice. */
export function showMealLines(enabled: boolean, menu: MealMenu, summary: CateringSummary | null) {
  return (enabled && shownCourses(menu).length > 0) || !!summary?.meals.length;
}

export type CourseCount = {
  course: Course;
  title: string;
  options: { id: string; label: string; count: number }[];
  noLongerOnMenu: number;
  noChoice: number;
};

/**
 * One block per course that's on the current menu (while meal choices are on) or that any attending reply chose from.
 * Options are in menu order; replies whose choice no longer matches count as "No longer on the menu", and attending
 * replies without an answer for the course count as "No choice".
 */
export function courseCounts(summary: CateringSummary, menu: MealMenu, enabled: boolean): CourseCount[] {
  const current = enabled ? shownCourses(menu) : [];
  return courses.filter((course) => current.includes(course) || summary.meals.some((meal) => meal.course === course)).map((course) => {
    const answers = summary.meals.filter((meal) => meal.course === course);
    const options = menu[course].map((option) => ({
      ...option,
      count: answers.filter((meal) => meal.id === option.id && meal.label === option.label).reduce((sum, meal) => sum + meal.count, 0),
    }));
    const answered = answers.reduce((sum, meal) => sum + meal.count, 0);
    const matched = options.reduce((sum, option) => sum + option.count, 0);
    return { course, title: courseWords[course].title, options, noLongerOnMenu: answered - matched, noChoice: Math.max(0, summary.attending - answered) };
  });
}

export function dietaryCounts(summary: CateringSummary) {
  const counts: Record<Dietary, number> = { vegetarian: summary.vegetarian, vegan: summary.vegan, gluten_free: summary.gluten_free, other: summary.other.length };
  return dietaryChoices.map(({ value, label }) => ({ value, label, count: counts[value] }));
}

export function responseHasFood(food: ResponseFood) {
  return Object.keys(food.meal_choices ?? {}).length > 0 || food.dietary_vegetarian || food.dietary_vegan || food.dietary_gluten_free || food.dietary_other !== null;
}

export function responseDietary(food: ResponseFood): Dietary[] {
  return dietaryChoices.map(({ value }) => value).filter((value) =>
    value === "other" ? food.dietary_other !== null : food[`dietary_${value}`]);
}

export type MealLine = { title: string; label: string | null; stale: boolean };

/**
 * An attending reply's meal lines: each course on the current menu (while meal choices are on) or answered by the
 * reply. Null means the reply has no meal answers at all ("No meal choice").
 */
export function replyMealLines(food: ResponseFood, menu: MealMenu, enabled: boolean): MealLine[] | null {
  const choices = food.meal_choices ?? {};
  if (!Object.keys(choices).length) return null;
  const current = enabled ? shownCourses(menu) : [];
  return courses.filter((course) => current.includes(course) || choices[course]).map((course) => {
    const choice = choices[course];
    return { title: courseWords[course].title, label: choice?.label ?? null, stale: !!choice && !onMenu(menu, course, choice) };
  });
}
