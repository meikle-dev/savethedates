import { describe, expect, it } from "vitest";
import { courseCounts, dietaryCounts } from "../workspace/catering";
import { exampleMealMenu } from "./example-data";
import { demoAnnouncement, demoFoodLines, demoReplies, demoReplyFromForm, demoStarted, demoSummary, emptyDemoReply } from "./offer-demo";

const [soup] = exampleMealMenu.starter;
const [, , risotto] = exampleMealMenu.main;
const [toffee] = exampleMealMenu.dessert;

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

describe("what we offer demo", () => {
  it("counts the fictional replies like the workspace", () => {
    const summary = demoSummary(demoReplies);
    expect(summary.attending).toBe(5);
    const mains = courseCounts(summary, exampleMealMenu, true).find((block) => block.course === "main")!;
    expect(mains.options.map((option) => option.count)).toEqual([2, 2, 1]);
    expect(mains.noChoice).toBe(0);
    expect(dietaryCounts(summary).map(({ count }) => count)).toEqual([1, 0, 1, 1]);
  });

  it("reads the example RSVP form and adds the visitor's reply to the numbers", () => {
    const reply = demoReplyFromForm(form([["responding_name", " Jo "], ["attending", "yes"], ["meal_starter", soup.id], ["meal_main", risotto.id], ["meal_dessert", toffee.id], ["dietary", "vegan"], ["dietary", "other"], ["dietary_other", "No mushrooms"]]));
    expect(reply).toEqual({ name: "Jo", attending: true, food: { meals: { starter: soup.id, main: risotto.id, dessert: toffee.id }, dietary: ["vegan", "other"], other: "No mushrooms" } });
    const summary = demoSummary([...demoReplies, reply]);
    expect(summary.attending).toBe(6);
    expect(summary.meals.find((meal) => meal.id === risotto.id)?.count).toBe(2);
    expect(summary.vegan).toBe(1);
    expect(summary.other).toContainEqual({ name: "Jo", text: "No mushrooms" });
    expect(demoFoodLines(reply)).toEqual([soup.label, risotto.label, toffee.label, "Dietary: Vegan, Other: “No mushrooms”"]);
    expect(demoAnnouncement(reply)).toMatch(/^Jo: attending\. .*Catering numbers updated\.$/);
  });

  it("ignores food answers from a guest who declines, and shows nothing until the reply starts", () => {
    const reply = demoReplyFromForm(form([["attending", "no"], ["meal_main", risotto.id], ["dietary", "vegan"]]));
    expect(reply.food).toEqual({ meals: {}, dietary: [], other: "" });
    expect(demoSummary([...demoReplies, reply]).attending).toBe(5);
    expect(demoAnnouncement(reply)).toBe("Your reply: not attending. Catering numbers unchanged.");
    expect(demoStarted(emptyDemoReply())).toBe(false);
    expect(demoStarted(demoReplyFromForm(form([["responding_name", "Jo"]])))).toBe(true);
  });
});
