import { z } from "zod";
import { invitationTokenPattern } from "./invitation-context";

export const rsvpNameSchema = z.string().trim().min(1, "Enter your name.").max(80, "Use no more than 80 characters.");
export const invitationTokenSchema = z.string().regex(invitationTokenPattern);
export const closeDateSchema = z.union([
  z.literal("").transform(() => null),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= "2199-12-31";
  }, "Enter a valid closing date."),
]);

export type SharedResponse = { id: string; responding_name: string; attending: boolean; responded_at: string };

export type RsvpState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  shareUrl?: string;
};
