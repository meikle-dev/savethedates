import { createHash } from "node:crypto";
import { z } from "zod";
import type { WeddingTheme } from "./themes";
import { invitationTokenPattern } from "./invitation-context";

export const inviteNameSchema = z.string().trim().min(1, "Enter a name for this invitation.").max(80, "Use no more than 80 characters.");
export const rsvpNameSchema = z.string().trim().min(1, "Enter your name.").max(80, "Use no more than 80 characters.");
export const invitationTokenSchema = z.string().regex(invitationTokenPattern);
export const closeDateSchema = z.union([
  z.literal("").transform(() => null),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= "2199-12-31";
  }, "Enter a valid closing date."),
]);

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type OwnerInvitation = {
  id: string;
  invite_name: string;
  responding_name: string | null;
  attending: boolean | null;
  responded_at: string | null;
  revoked_at: string | null;
};

export type GuestRsvp = {
  first_name: string;
  second_name: string;
  theme: WeddingTheme;
  invite_name: string;
  responding_name: string | null;
  attending: boolean | null;
  responded_at: string | null;
  is_open: boolean;
  closes_on: string | null;
};

export type RsvpState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  inviteUrl?: string;
  inviteName?: string;
  weddingUrl?: string;
  respondingName?: string;
  attending?: boolean;
};
