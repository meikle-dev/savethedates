import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);
export const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(128, "Use no more than 128 characters.");
export type FormState = { message?: string; errors?: Record<string, string[] | undefined>; success?: boolean; submittedEmail?: string };
