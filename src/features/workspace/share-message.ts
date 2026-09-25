// F042: the pre-written message couples can edit before sharing their guest link. Built from saved data and never stored.
import { formatWeddingDate } from "../weddings/wedding";
import type { RsvpAvailability } from "./workspace-summary";

type MessageInput = { firstName: string; secondName: string; date: string; location: string; url: string; rsvpOpen: boolean };

export function shareMessage({ firstName, secondName, date, location, url, rsvpOpen }: MessageInput) {
  const place = location.trim().replace(/[\s.]+$/, "");
  return `Save the date! ${firstName} & ${secondName} are getting married on ${formatWeddingDate(date)}${place ? ` at ${place}` : ""}. ${rsvpOpen ? "Details and RSVP here" : "Find out more"}: ${url}`;
}

const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text actually shared or copied: the couple's edit, with the full guest link appended if they removed or altered it. */
export function withGuestLink(message: string, url: string) {
  if (new RegExp(`${escaped(url)}(?![A-Za-z0-9_/-])`).test(message)) return message;
  const text = message.trim();
  return text ? `${text}\n${url}` : url;
}

/** WhatsApp's own share link; it opens a chat picker with the text filled in. Nothing is sent until the couple sends it. */
export function whatsAppHref(text: string) {
  // encodeURIComponent throws on an unpaired surrogate (possible in pasted text); replace it with U+FFFD, as toWellFormed() does.
  const wellFormed = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�");
  return `https://wa.me/?text=${encodeURIComponent(wellFormed)}`;
}

/** What guests can currently do with the live link, stated explicitly so a closed RSVP is never mistaken for open. */
export function rsvpShareStatus(availability: RsvpAvailability, closesOn: string | null) {
  if (availability === "open") return { label: "RSVPs open", note: closesOn ? `Guests can reply until ${formatWeddingDate(closesOn)}.` : "Guests can reply." };
  if (availability === "closed") return { label: "RSVPs closed", note: `RSVPs closed on ${formatWeddingDate(closesOn!)}. Guests can still view your site but can’t reply.` };
  if (availability === "off") return { label: "RSVPs off", note: "Guests can view your site but can’t reply until you open RSVPs." };
  return { label: "RSVPs open when published", note: "Guests can reply once your site is published." };
}
