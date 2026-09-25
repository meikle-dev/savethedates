// F042: the pre-written message couples can edit before sharing their guest link. Built from saved data and never stored.
import { formatWeddingDate, rsvpDeadline } from "../weddings/wedding";
import type { RsvpAvailability } from "./workspace-summary";

type MessageInput = { firstName: string; secondName: string; date: string; location: string; url: string; rsvpOpen: boolean; invitation?: boolean };

// F060: while the Invitation page is on, the suggested message invites rather than announces.
export function shareMessage({ firstName, secondName, date, location, url, rsvpOpen, invitation = false }: MessageInput) {
  const place = location.trim().replace(/[\s.]+$/, "");
  const news = `${firstName} & ${secondName} are getting married on ${formatWeddingDate(date)}${place ? ` at ${place}` : ""}.`;
  if (invitation) return `You’re invited! ${news} ${rsvpOpen ? "Your invitation and RSVP" : "Your invitation"}: ${url}`;
  return `Save the date! ${news} ${rsvpOpen ? "Details and RSVP here" : "Find out more"}: ${url}`;
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

/**
 * What guests can do with the guest link, stated explicitly so a closed RSVP is never mistaken for open. `live` says
 * whether the site is published now; before that, the note describes what happens after publishing. A closing date
 * is always given with its exact UTC cutoff, matching database enforcement; no date means no deadline is mentioned.
 */
export function rsvpShareStatus(availability: RsvpAvailability, closesOn: string | null, live = true) {
  const until = closesOn ? rsvpDeadline(closesOn).exact : null;
  switch (availability) {
    case "open": return { label: "RSVPs open", note: until ? `Guests can reply until ${until}.` : "Guests can reply. There is no closing date." };
    case "not-live": return { label: "RSVPs open when published", note: `RSVPs are on. Guests can reply once your site is published${until ? `, until ${until}` : ""}.` };
    case "closed": return { label: "RSVPs closed", note: live
      ? `RSVPs closed at ${until}. Guests can still view your site but can’t reply.`
      : `Your closing date has passed (${until}), so guests won’t be able to reply. Change or clear the date to reopen RSVPs.` };
    case "off": return { label: "RSVPs off", note: live
      ? "Guests can view your site but can’t reply until you open RSVPs."
      : "RSVPs are off. After you publish, guests can view your site but can’t reply until you open RSVPs." };
    case "offline": return { label: "Site offline", note: "Your site is no longer online, so guests can’t view it or reply." };
  }
}
