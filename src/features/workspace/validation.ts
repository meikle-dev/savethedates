import { z } from "zod";

const requiredText = (label: string, max: number) => z.string().trim().min(1, `${label} is required.`).max(max, `Use no more than ${max} characters.`);
export const draftSchema = z.object({
  first_name: requiredText("Your name", 80),
  second_name: requiredText("Your partner’s name", 80),
  wedding_date: z.string().trim().min(1, "Choose your wedding date.").refine((value) => {
    if (!/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid date between 1900 and 2199."),
  location: requiredText("Location", 160),
  message: z.string().trim().max(500, "Use no more than 500 characters."),
});
export type Draft = z.infer<typeof draftSchema>;
