// F070: the "try it as a guest" demo on /what-we-offer. The visitor's example reply joins a few fictional replies, and
// the couple's side is counted with the same rules as the workspace. Pure, so it is unit tested; nothing is sent.
import { courses, dietaryChoices, dietaryText, guestFoodFromForm, type Course, type Dietary, type GuestFood } from "../weddings/meal-menu";
import type { CateringSummary } from "../workspace/catering";
import { exampleMealMenu } from "./example-data";

export type DemoReply = { name: string; attending: boolean | null; food: GuestFood };

const [soup, salmon] = exampleMealMenu.starter.map(({ id }) => id);
const [beef, hake, risotto] = exampleMealMenu.main.map(({ id }) => id);
const [toffee, posset] = exampleMealMenu.dessert.map(({ id }) => id);
const food = (starter: string, main: string, dessert: string, dietary: Dietary[] = [], other = ""): GuestFood =>
  ({ meals: { starter, main, dessert }, dietary, other });

/** Fictional replies already in the example replies. */
export const demoReplies: DemoReply[] = [
  { name: "Amelia Hart", attending: true, food: food(soup, beef, toffee) },
  { name: "Tom Hart", attending: true, food: food(salmon, hake, posset) },
  { name: "Priya Shah", attending: true, food: food(soup, risotto, posset, ["vegetarian"]) },
  { name: "Ben Carter", attending: false, food: food("", "", "") },
  { name: "Grace O’Neill", attending: true, food: food(salmon, hake, toffee, ["gluten_free"]) },
  { name: "Sam Okafor", attending: true, food: food(soup, beef, posset, ["other"], "No nuts") },
];

export const emptyDemoReply = (): DemoReply => ({ name: "", attending: null, food: { meals: {}, dietary: [], other: "" } });

/** Reads the example RSVP form with the same parser the real reply uses. */
export function demoReplyFromForm(form: FormData): DemoReply {
  const attending = form.get("attending");
  return {
    name: String(form.get("responding_name") ?? "").trim().slice(0, 80),
    attending: attending === "yes" ? true : attending === "no" ? false : null,
    food: attending === "yes" ? guestFoodFromForm(form) : { meals: {}, dietary: [], other: "" },
  };
}

/** Whether the visitor has started a reply, so their row appears in the replies. */
export const demoStarted = (reply: DemoReply) => reply.name !== "" || reply.attending !== null;

/** The catering numbers over every attending reply, in the workspace's summary shape. */
export function demoSummary(replies: DemoReply[]): CateringSummary {
  const attending = replies.filter((reply) => reply.attending === true);
  const meals = courses.flatMap((course) => exampleMealMenu[course].map(({ id, label }) =>
    ({ course, id, label, count: attending.filter((reply) => reply.food.meals[course] === id).length })));
  const ticked = (value: Dietary) => attending.filter((reply) => reply.food.dietary.includes(value)).length;
  return {
    attending: attending.length,
    meals: meals.filter((meal) => meal.count > 0),
    vegetarian: ticked("vegetarian"),
    vegan: ticked("vegan"),
    gluten_free: ticked("gluten_free"),
    other: attending.filter((reply) => reply.food.dietary.includes("other"))
      .map((reply) => ({ name: reply.name || "You", text: reply.food.other.trim() || "not given yet" })),
  };
}

/** One guest-list line per chosen course, then the food preferences, as the workspace shows them. */
export function demoFoodLines(reply: DemoReply) {
  if (!reply.attending) return [];
  const meals = courses.flatMap((course: Course) => {
    const label = exampleMealMenu[course].find((option) => option.id === reply.food.meals[course])?.label;
    return label ? [label] : [];
  });
  const dietary = reply.food.dietary.filter((value) => dietaryChoices.some((choice) => choice.value === value));
  return [...meals, `Dietary: ${dietaryText(dietary, reply.food.other.trim() || "not given yet", "none given", true)}`];
}

/** The polite announcement after the visitor changes their reply. */
export function demoAnnouncement(reply: DemoReply) {
  const who = reply.name || "Your reply";
  if (reply.attending === null) return `${who} added to the replies.`;
  if (!reply.attending) return `${who}: not attending. Catering numbers unchanged.`;
  const lines = demoFoodLines(reply);
  return `${who}: attending. ${lines.join(". ")}. Catering numbers updated.`;
}
