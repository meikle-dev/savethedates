import { z } from "zod";
import { reservedNames } from "../weddings/guest-link";

export { reservedNames };
// The names part of the guest link. It is not unique: the secret after it identifies the wedding.
export const slugSchema = z.string().trim().toLowerCase()
  .min(3, "Use at least 3 letters or numbers.")
  .max(63, "Use no more than 63 characters.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use only letters, numbers and single hyphens between words, for example alex-and-morgan.")
  .refine((value) => !reservedNames.has(value), "Those names are used by SaveTheDates pages. Please choose others.");

export function slugError(result: { success: boolean; error?: z.ZodError }) {
  return result.success ? undefined : [result.error?.issues[0]?.message ?? "Check the names in your guest link."];
}
