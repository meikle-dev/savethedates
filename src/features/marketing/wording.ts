import { formatWeddingDate } from "../weddings/wedding";

// F077: the save the date wording guide. Templates use {names}, {date}, {place} and {link}; anything the couple
// hasn't typed stays as a visible [placeholder], so a copied message never silently drops a detail.
export type WordingTemplate = { id: string; title: string; text: string };
export type WordingGroup = { id: string; heading: string; intro: string; templates: WordingTemplate[] };

export const wordingGroups: WordingGroup[] = [
  {
    id: "whatsapp", heading: "For WhatsApp and text", intro: "Short enough to read in a notification, with the link doing the rest.",
    templates: [
      { id: "short", title: "Short and sweet", text: "Save the date! {names} are getting married on {date} in {place}. Invitation to follow. {link}" },
      { id: "warm", title: "Warm and relaxed", text: "We have news! We’re getting married on {date} in {place}, and we’d love you to be there. Please save the date. We’ll send the invitation nearer the time, and everything you need is here: {link}\n\nLove, {names}" },
      { id: "group", title: "For the family group chat", text: "Hi everyone! Please save {date} for our wedding in {place}. Invitations will follow, but we wanted you to hear it from us first. {link}\n\n{names}" },
    ],
  },
  {
    id: "email", heading: "For email", intro: "A little more formal, for guests you’d usually send a card to.",
    templates: [
      { id: "formal", title: "Formal", text: "Please save the date for the wedding of {names} on {date} in {place}.\n\nA formal invitation will follow. In the meantime, you can find the details here: {link}" },
      { id: "families", title: "Together with our families", text: "Together with our families, we’re delighted to ask you to save the date for our wedding on {date} in {place}.\n\nInvitation to follow. {link}\n\nWith love,\n{names}" },
    ],
  },
  {
    id: "occasions", heading: "For particular weddings", intro: "When guests need a little more notice or a little more explanation.",
    templates: [
      { id: "destination", title: "Destination wedding", text: "Save the date! {names} are getting married in {place} on {date}. We know travelling takes planning, so we wanted to let you know early. Your invitation will follow, and you’ll find travel and accommodation details here: {link}" },
      { id: "evening", title: "Evening reception", text: "{names} are getting married on {date}, and we’d love you to join us for the evening celebration in {place}. Please save the date. Invitation to follow. {link}" },
      { id: "change", title: "Change of date", text: "Change of plan: {names} are now getting married on {date} in {place}. Please update your diary. Everything else is on the same link: {link}" },
    ],
  },
];

export type WordingDetails = { names: string; date: string; place: string; link: string };

export const wordingPlaceholders: Record<keyof WordingDetails, string> = {
  names: "[your names]", date: "[wedding date]", place: "[town or venue]", link: "[your link]",
};

/** `details.date` is the ISO date from the date field; it's written out in words. */
export function fillWording(text: string, details: WordingDetails) {
  const date = isIsoDate(details.date) ? formatWeddingDate(details.date) : "";
  const values: WordingDetails = { names: details.names.trim(), date, place: details.place.trim(), link: details.link.trim() };
  return text.replace(/\{(names|date|place|link)\}/g, (_, key: keyof WordingDetails) => values[key] || wordingPlaceholders[key]);
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// All dates are calendar dates handled in UTC, so the visitor's time zone never shifts a day.
function toDate(iso: string) { return new Date(`${iso}T00:00:00Z`); }
function toIso(date: Date) { return date.toISOString().slice(0, 10); }

/** The same day `months` earlier, or the month's last day when it has no such day (31 August → 28/29 February). */
export function monthsBefore(iso: string, months: number) {
  const date = toDate(iso);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return toIso(target);
}

export function weeksBefore(iso: string, weeks: number) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() - weeks * 7);
  return toIso(date);
}

/** `started`: the window has opened (its first day is today or earlier). `late`: its last day has passed. */
export type SendingWindow = { from: string; to: string; started: boolean; late: boolean };
export type SendingPlan = { saveTheDate: SendingWindow; invitation: SendingWindow; replyBy: { date: string; late: boolean } };

/**
 * Suggested send dates, matching the site's FAQ: save the dates six to twelve months ahead (nine to twelve for a
 * destination wedding), invitations eight to twelve weeks ahead (three to four months for a destination wedding)
 * and replies six weeks ahead. Dates already before `today` are flagged so none is shown as advice. Null for an invalid
 * wedding date or one that isn't after `today`.
 */
export function sendingPlan(weddingDate: string, destination: boolean, today: string): SendingPlan | null {
  if (!isIsoDate(weddingDate) || !isIsoDate(today) || weddingDate <= today) return null;
  const window = (from: string, to: string): SendingWindow => ({ from, to, started: from <= today, late: to < today });
  const replyBy = weeksBefore(weddingDate, 6);
  return {
    saveTheDate: window(monthsBefore(weddingDate, 12), monthsBefore(weddingDate, destination ? 9 : 6)),
    invitation: destination ? window(monthsBefore(weddingDate, 4), monthsBefore(weddingDate, 3)) : window(weeksBefore(weddingDate, 12), weeksBefore(weddingDate, 8)),
    replyBy: { date: replyBy, late: replyBy < today },
  };
}
