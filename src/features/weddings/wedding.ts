import type { WeddingTheme } from "./themes";
import type { PhotoFraming } from "./photo-framing";

export type Wedding = {
  theme?: WeddingTheme;
  names: readonly [string, string];
  date: string;
  location: string;
  message?: string;
  image?: { src: string; alt: string };
  photoFraming?: PhotoFraming;
};

export function formatWeddingDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

const ukTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/London" });
const ukDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });

/**
 * The closing-date contract enforced by the database: replies are accepted while the UTC date is on or before
 * the closing date, so the last accepted minute is 23:59 UTC that day. In the UK and Ireland that is 23:59 in
 * winter (GMT) and 00:59 the next day in summer (BST/IST).
 */
export function rsvpDeadline(closesOn: string) {
  const date = formatWeddingDate(closesOn);
  const lastMinute = new Date(`${closesOn}T23:59:00Z`);
  const time = ukTime.format(lastMinute);
  const local = time === "23:59" ? "23:59 in the UK and Ireland" : `${time} on ${ukDay.format(lastMinute)} in the UK and Ireland`;
  return { date, exact: `23:59 UTC on ${date} (${local})` };
}
