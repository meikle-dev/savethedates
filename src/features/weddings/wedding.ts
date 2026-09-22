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
