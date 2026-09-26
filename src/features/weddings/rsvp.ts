import { z } from "zod";
import { guestSecretPattern } from "./guest-link";
import type { Course, Dietary, MealMenu, MealOption } from "./meal-menu";

export const rsvpNameSchema = z.string().trim().min(1, "Enter your name.").max(80, "Use no more than 80 characters.");
export const guestSecretSchema = z.string().regex(guestSecretPattern);
export const closeDateSchema = z.union([
  z.literal("").transform(() => null),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= "2199-12-31";
  }, "Enter a valid closing date."),
]);

export type SharedResponse = { id: string; responding_name: string; attending: boolean; responded_at: string };
/** F068: a reply's food answers, as stored. Replies from before meal choices have `{}` and no requirements. */
export type ResponseFood = { meal_choices: Partial<Record<Course, MealOption>>; dietary_vegetarian: boolean; dietary_vegan: boolean; dietary_gluten_free: boolean; dietary_other: string | null };
export type GuestListResponse = SharedResponse & ResponseFood;
export const responseFoodColumns = "meal_choices, dietary_vegetarian, dietary_vegan, dietary_gluten_free, dietary_other";

export type RsvpState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** A guest's own unsaved entry, returned only to refill their form after a rejected submission. */
  values?: { responding_name: string; attending?: "yes" | "no"; meals?: Partial<Record<Course, string>>; dietary?: Dietary[]; dietary_other?: string };
  /** The current menu, returned when the couple changed it while the guest's page was open (null: meal choices off). */
  menuUpdate?: { menu: MealMenu | null };
  /** An accepted reply's "Your choices" lines, built from the submission itself. */
  choices?: string[];
};
