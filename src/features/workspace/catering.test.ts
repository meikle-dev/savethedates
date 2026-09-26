import { describe, expect, it } from "vitest";
import type { MealMenu } from "../weddings/meal-menu";
import type { ResponseFood } from "../weddings/rsvp";
import { courseCounts, dietaryCounts, parseCateringSummary, replyMealLines, responseDietary, responseHasFood, showMealLines } from "./catering";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const menu: MealMenu = {
  starter: [{ id: id(1), label: "Soup" }, { id: id(2), label: "Salmon" }],
  main: [{ id: id(3), label: "Beef" }, { id: id(4), label: "Hake" }],
  dessert: [],
};
const summary = parseCateringSummary({
  attending: 6,
  meals: [
    { course: "starter", id: id(1), label: "Soup", count: 2 },
    { course: "starter", id: id(2), label: "Smoked salmon", count: 1 }, // renamed since
    { course: "starter", id: id(9), label: "Pâté", count: 1 }, // removed since
    { course: "main", id: id(3), label: "Beef", count: 4 },
    { course: "dessert", id: id(8), label: "Trifle", count: 1 }, // course emptied since
    { course: "nonsense", id: id(1), label: "x", count: 9 },
  ],
  vegetarian: 2, vegan: 1, gluten_free: 0,
  other: [{ name: "Sam Jones", text: "no mushrooms" }, { name: 3, text: "ignored" }],
});
const food = (values: Partial<ResponseFood>): ResponseFood => ({ meal_choices: {}, dietary_vegetarian: false, dietary_vegan: false, dietary_gluten_free: false, dietary_other: null, ...values });

describe("catering numbers", () => {
  it("counts matching options in menu order, and renamed or removed choices as no longer on the menu", () => {
    const [starter, main, dessert] = courseCounts(summary, menu, true);
    expect(starter).toEqual({ course: "starter", title: "Starter", options: [{ id: id(1), label: "Soup", count: 2 }, { id: id(2), label: "Salmon", count: 0 }], noLongerOnMenu: 2, noChoice: 2 });
    expect(main).toMatchObject({ options: [{ label: "Beef", count: 4 }, { label: "Hake", count: 0 }], noLongerOnMenu: 0, noChoice: 2 });
    // Still listed because a reply chose from it.
    expect(dessert).toMatchObject({ course: "dessert", options: [], noLongerOnMenu: 1, noChoice: 5 });
  });

  it("shows only courses replies chose from while meal choices are off", () => {
    const off = parseCateringSummary({ attending: 3, meals: [{ course: "main", id: id(3), label: "Beef", count: 1 }], other: [] });
    expect(courseCounts(off, menu, false).map((block) => block.course)).toEqual(["main"]);
    expect(courseCounts(parseCateringSummary({ attending: 3 }), menu, false)).toEqual([]);
    expect(showMealLines(false, menu, parseCateringSummary({ attending: 3 }))).toBe(false);
    expect(showMealLines(true, menu, null)).toBe(true);
    expect(showMealLines(false, menu, off)).toBe(true);
  });

  it("counts each food preference, with Other from its entries", () => {
    expect(dietaryCounts(summary)).toEqual([
      { value: "vegetarian", label: "Vegetarian", count: 2 },
      { value: "vegan", label: "Vegan", count: 1 },
      { value: "gluten_free", label: "Gluten-free", count: 0 },
      { value: "other", label: "Other", count: 1 },
    ]);
  });
});

describe("reply food lines", () => {
  it("marks renamed or removed choices and courses without an answer", () => {
    const reply = food({ meal_choices: { starter: { id: id(2), label: "Smoked salmon" }, dessert: { id: id(8), label: "Trifle" } } });
    expect(replyMealLines(reply, menu, true)).toEqual([
      { title: "Starter", label: "Smoked salmon", stale: true },
      { title: "Main", label: null, stale: false },
      { title: "Dessert", label: "Trifle", stale: true },
    ]);
    expect(replyMealLines(food({ meal_choices: { main: { id: id(3), label: "Beef" } } }), menu, false)).toEqual([{ title: "Main", label: "Beef", stale: false }]);
    expect(replyMealLines(food({}), menu, true)).toBeNull();
  });

  it("knows when a reply has food answers to clear", () => {
    expect(responseHasFood(food({}))).toBe(false);
    expect(responseHasFood(food({ dietary_other: "no mushrooms" }))).toBe(true);
    expect(responseHasFood(food({ meal_choices: { main: { id: id(3), label: "Beef" } } }))).toBe(true);
    expect(responseDietary(food({ dietary_vegan: true, dietary_gluten_free: true, dietary_other: "no mushrooms" }))).toEqual(["vegan", "gluten_free", "other"]);
  });
});
