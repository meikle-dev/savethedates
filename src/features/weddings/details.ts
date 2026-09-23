import { z } from "zod";
import type { WeddingTheme } from "./themes";

const shortText = z.string().trim().max(160, "Use no more than 160 characters.");
const longText = z.string().trim().max(1000, "Use no more than 1,000 characters.");
const optionalUrl = z.string().trim().max(2048, "Use a shorter link.").refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    const hostname = url.hostname;
    return ["http:", "https:"].includes(url.protocol)
      && (hostname === "localhost" || /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(hostname));
  } catch {
    return false;
  }
}, "Enter a complete http:// or https:// link.").transform((value) => value ? new URL(value).href : "");

export function validOptionalUrl(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = optionalUrl.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const faqSchema = z.object({
  question: z.string().trim().min(1, "Add a question.").max(200, "Use no more than 200 characters."),
  answer: longText.pipe(z.string().min(1, "Add an answer.")),
}).strict();

export const detailsSchema = z.object({
  details_enabled: z.boolean(),
  ceremony_time: shortText,
  ceremony_venue: shortText,
  ceremony_address: shortText,
  ceremony_url: optionalUrl,
  reception_time: shortText,
  reception_venue: shortText,
  reception_address: shortText,
  reception_url: optionalUrl,
  travel: longText,
  travel_url: optionalUrl,
  accommodation: longText,
  accommodation_url: optionalUrl,
  dress_code: longText,
  faqs: z.array(faqSchema).max(5, "Add no more than five questions."),
}).superRefine((details, context) => {
  const hasContent = Object.entries(details).some(([key, value]) =>
    key !== "details_enabled" && key !== "faqs" && typeof value === "string" && value.length > 0,
  ) || details.faqs.length > 0;
  if (details.details_enabled && !hasContent) {
    context.addIssue({ code: "custom", path: ["details_enabled"], message: "Add at least one section before showing the Details page." });
  }
});

export type WeddingDetails = z.infer<typeof detailsSchema>;
export type WeddingFaq = z.infer<typeof faqSchema>;

export type DetailsFormState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  success?: boolean;
  values?: WeddingDetails;
};

export type WeddingDetailsPage = WeddingDetails & {
  first_name: string;
  second_name: string;
  theme: WeddingTheme;
};

export const emptyDetails: WeddingDetails = {
  details_enabled: false,
  ceremony_time: "",
  ceremony_venue: "",
  ceremony_address: "",
  ceremony_url: "",
  reception_time: "",
  reception_venue: "",
  reception_address: "",
  reception_url: "",
  travel: "",
  travel_url: "",
  accommodation: "",
  accommodation_url: "",
  dress_code: "",
  faqs: [],
};

export function detailsFormValues(form: FormData): WeddingDetails {
  let faqs: WeddingFaq[] = [];
  try {
    const submitted = JSON.parse(String(form.get("faqs") ?? "[]"));
    if (Array.isArray(submitted)) {
      faqs = submitted.slice(0, 5).map((faq) => ({
        question: typeof faq?.question === "string" ? faq.question : "",
        answer: typeof faq?.answer === "string" ? faq.answer : "",
      }));
    }
  } catch {
    // Invalid direct submissions are rejected by detailsSchema below.
  }
  const text = (name: string) => String(form.get(name) ?? "");
  return {
    details_enabled: form.get("details_enabled") === "on",
    ceremony_time: text("ceremony_time"),
    ceremony_venue: text("ceremony_venue"),
    ceremony_address: text("ceremony_address"),
    ceremony_url: text("ceremony_url"),
    reception_time: text("reception_time"),
    reception_venue: text("reception_venue"),
    reception_address: text("reception_address"),
    reception_url: text("reception_url"),
    travel: text("travel"),
    travel_url: text("travel_url"),
    accommodation: text("accommodation"),
    accommodation_url: text("accommodation_url"),
    dress_code: text("dress_code"),
    faqs,
  };
}

export function parseDetailsForm(form: FormData) {
  const values = detailsFormValues(form);
  let faqs: unknown;
  try {
    faqs = JSON.parse(String(form.get("faqs") ?? "[]"));
  } catch {
    faqs = null;
  }
  return detailsSchema.safeParse({ ...values, faqs });
}

export function hasVenue(details: WeddingDetails, kind: "ceremony" | "reception") {
  return Boolean(details[`${kind}_time`] || details[`${kind}_venue`] || details[`${kind}_address`] || details[`${kind}_url`]);
}
