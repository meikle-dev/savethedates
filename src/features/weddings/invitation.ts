import { z } from "zod";
import type { WeddingTheme } from "./themes";

export const standardInvitationWording = "request the pleasure of your company at their wedding";

const text = (max: number) => z.string().trim().max(max, `Use no more than ${max.toLocaleString("en-GB")} characters.`);

// Ceremony time, venue and address are the Details columns; both forms edit the same values.
export const invitationSchema = z.object({
  invitation_enabled: z.boolean(),
  invitation_host_line: text(160),
  invitation_wording: text(300),
  invitation_afterwards: text(160),
  ceremony_time: text(160),
  ceremony_venue: text(160),
  ceremony_address: text(160),
});

export type InvitationSettings = z.infer<typeof invitationSchema>;

export type InvitationFormState = {
  message?: string;
  errors?: Partial<Record<keyof InvitationSettings, string[]>>;
  success?: boolean;
  values?: InvitationSettings;
};

const fields = ["invitation_host_line", "invitation_wording", "invitation_afterwards", "ceremony_time", "ceremony_venue", "ceremony_address"] as const;

export function invitationFormValues(form: FormData): InvitationSettings {
  const values = Object.fromEntries(fields.map((field) => [field, String(form.get(field) ?? "")]));
  return { ...values, invitation_enabled: form.get("invitation_enabled") === "on" } as InvitationSettings;
}

/** What a guest (or the owner's preview) sees: the saved invitation plus the wedding it belongs to. */
export type InvitationPage = Omit<InvitationSettings, "invitation_enabled"> & {
  first_name: string;
  second_name: string;
  wedding_date: string;
  location: string;
  theme: WeddingTheme;
};

/** Where the wedding is: the ceremony address, or the Basics location when no address is saved. */
export function invitationPlace(invitation: Pick<InvitationPage, "ceremony_address" | "location">) {
  return invitation.ceremony_address.trim() || invitation.location.trim();
}

const invitationDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "Monday 14 June 2027": invitations name the weekday. */
export function formatInvitationDate(date: string) {
  return invitationDate.format(new Date(`${date}T12:00:00Z`)).replace(",", "");
}
