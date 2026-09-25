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

  it("invites rather than announces while the Invitation page is on", () => {
    expect(shareMessage({ ...base, invitation: true })).toBe(`You’re invited! Sarah & James are getting married on 12 June 2027 at Mount Stewart. Your invitation and RSVP: ${url}`);
    expect(shareMessage({ ...base, invitation: true, rsvpOpen: false })).toBe(`You’re invited! Sarah & James are getting married on 12 June 2027 at Mount Stewart. Your invitation: ${url}`);
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
    expect(rsvpShareStatus("open", null)).toEqual({ label: "RSVPs open", note: "Guests can reply. There is no closing date." });
    expect(rsvpShareStatus("open", "2027-05-01").note).toBe("Guests can reply until 23:59 UTC on 1 May 2027 (00:59 on 2 May in the UK and Ireland).");
    expect(rsvpShareStatus("closed", "2026-12-01")).toEqual({ label: "RSVPs closed", note: "RSVPs closed at 23:59 UTC on 1 December 2026 (23:59 in the UK and Ireland). Guests can still view your site but can’t reply." });
    expect(rsvpShareStatus("off", null).label).toBe("RSVPs off");
  });

  it("describes readiness accurately before publishing and once the site is offline", () => {
    expect(rsvpShareStatus("not-live", null, false)).toEqual({ label: "RSVPs open when published", note: "RSVPs are on. Guests can reply once your site is published." });
    expect(rsvpShareStatus("not-live", "2026-12-01", false).note).toBe("RSVPs are on. Guests can reply once your site is published, until 23:59 UTC on 1 December 2026 (23:59 in the UK and Ireland).");
    expect(rsvpShareStatus("off", null, false).note).toBe("RSVPs are off. After you publish, guests can view your site but can’t reply until you open RSVPs.");
    expect(rsvpShareStatus("off", null, true).note).toBe("Guests can view your site but can’t reply until you open RSVPs.");
    expect(rsvpShareStatus("closed", "2027-05-01", false).note).toMatch(/^Your closing date has passed \(23:59 UTC on 1 May 2027/);
    expect(rsvpShareStatus("offline", "2027-05-01", false)).toEqual({ label: "Site offline", note: "Your site is no longer online, so guests can’t view it or reply." });
    // No closing date never produces a deadline.
    for (const availability of ["open", "not-live", "off"] as const) expect(rsvpShareStatus(availability, null, availability === "open").note).not.toMatch(/UTC|until \d/);
  });
});
