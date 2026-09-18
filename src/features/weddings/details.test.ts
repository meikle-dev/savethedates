import { describe, expect, it } from "vitest";
import { detailsSchema, emptyDetails, parseDetailsForm } from "./details";

describe("wedding details validation", () => {
  it("accepts trimmed optional sections and complete FAQs", () => {
    const parsed = detailsSchema.parse({
      ...emptyDetails,
      details_enabled: true,
      ceremony_venue: "  The Old Hall  ",
      ceremony_url: "https://example.test/directions",
      faqs: [{ question: "  Can children attend?  ", answer: "  Please check your invitation.  " }],
    });
    expect(parsed.ceremony_venue).toBe("The Old Hall");
    expect(parsed.faqs[0]).toEqual({ question: "Can children attend?", answer: "Please check your invitation." });
  });

  it("rejects unsafe links, incomplete FAQs, and enabled empty pages", () => {
    expect(detailsSchema.safeParse({ ...emptyDetails, ceremony_url: "javascript:alert(1)" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...emptyDetails, ceremony_url: "http://a.example:99999" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...emptyDetails, faqs: [{ question: "Parking?", answer: "" }] }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...emptyDetails, details_enabled: true }).success).toBe(false);
  });

  it("treats malformed submitted FAQ data as a validation error", () => {
    const form = new FormData();
    for (const key of Object.keys(emptyDetails)) if (key !== "details_enabled" && key !== "faqs") form.set(key, "");
    form.set("faqs", "not-json");
    expect(parseDetailsForm(form).success).toBe(false);
  });
});
