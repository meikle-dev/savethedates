import { describe, expect, it } from "vitest";
import { guestUrl } from "../weddings/guest-link";
import { rsvpShareStatus, shareMessage, whatsAppHref, withGuestLink } from "./share-message";

const secret = "Ab3_-".repeat(8) + "xyz";
const url = guestUrl("https://savethedates.example", "sarah-and-james", secret);
const base = { firstName: "Sarah", secondName: "James", date: "2027-06-12", location: "Mount Stewart", url, rsvpOpen: true };

describe("share message", () => {
  it("builds the absolute guest link from the configured origin", () => {
    expect(url).toBe(`https://savethedates.example/sarah-and-james/${secret}`);
    expect(guestUrl("http://127.0.0.1:3000/", "a-and-b", secret)).toBe(`http://127.0.0.1:3000/a-and-b/${secret}`);
  });

  it("is built from saved names, date and location and ends with the full link", () => {
    expect(shareMessage(base)).toBe(`Save the date! Sarah & James are getting married on 12 June 2027 at Mount Stewart. Details and RSVP here: ${url}`);
    expect(shareMessage({ ...base, location: " Bath, England. ", rsvpOpen: false })).toBe(`Save the date! Sarah & James are getting married on 12 June 2027 at Bath, England. Find out more: ${url}`);
  });

  it("always shares the full link, even when the couple edits it out or alters it", () => {
    expect(withGuestLink(`See you there ${url} !`, url)).toBe(`See you there ${url} !`);
    expect(withGuestLink("See you there", url)).toBe(`See you there\n${url}`);
    expect(withGuestLink(`Broken ${url.slice(0, -1)}`, url)).toBe(`Broken ${url.slice(0, -1)}\n${url}`);
    expect(withGuestLink(`Altered ${url}x`, url)).toBe(`Altered ${url}x\n${url}`);
    expect(withGuestLink("   ", url)).toBe(url);
  });

  it("encodes the whole message for WhatsApp's own share link", () => {
    const text = `Zoë & Siân – 50% sure? #wedding\n${url}`;
    const href = whatsAppHref(text);
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    // No raw character that would end or split the text parameter: every one is percent-encoded.
    expect(href.slice("https://wa.me/?text=".length)).not.toMatch(/[ &#?\n/:]/);
    expect(new URL(href).searchParams.get("text")).toBe(text);
    expect([...new URL(href).searchParams.keys()]).toEqual(["text"]);
  });

  it("never throws on pasted text with an unpaired surrogate, and keeps real emoji", () => {
    const text = `Lone \uD83D and \uDE00 halves, whole 💍\n${url}`;
    expect(() => encodeURIComponent(text)).toThrow(URIError);
    expect(new URL(whatsAppHref(text)).searchParams.get("text")).toBe(`Lone � and � halves, whole 💍\n${url}`);
  });

  it("states closed and off RSVPs explicitly", () => {
    expect(rsvpShareStatus("open", null)).toEqual({ label: "RSVPs open", note: "Guests can reply." });
    expect(rsvpShareStatus("open", "2027-05-01").note).toBe("Guests can reply until 1 May 2027.");
    expect(rsvpShareStatus("closed", "2027-05-01")).toEqual({ label: "RSVPs closed", note: "RSVPs closed on 1 May 2027. Guests can still view your site but can’t reply." });
    expect(rsvpShareStatus("off", null).label).toBe("RSVPs off");
  });
});
