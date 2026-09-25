"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { copyText } from "./copy-link-button";
import { rsvpShareStatus, whatsAppHref, withGuestLink } from "./share-message";
import { Icon } from "./workspace-icons";
import type { RsvpAvailability } from "./workspace-summary";

export type GuestLinkShare = { url: string; message: string; availability: RsvpAvailability; closesOn: string | null };

const noSubscription = () => () => {};
const nativeShareSupported = () => typeof navigator.share === "function";

// F042: the live site's one guest link, shown the same way in Publish and the Overview. Render only while the site is
// live; drafts, unpublished and expired sites never get this panel. Every action is started by the couple, and the link
// goes only to the destination they choose (the share sheet, WhatsApp or their clipboard).
export function GuestLinkPanel({ url, message: suggested, availability, closesOn, justPublished = false }: GuestLinkShare & { justPublished?: boolean }) {
  // An edit belongs to the suggestion it was made from, so a renamed or replaced link shows the new suggestion.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const nativeShare = useSyncExternalStore(noSubscription, nativeShareSupported, () => false);
  const heading = useRef<HTMLHeadingElement>(null);
  const message = edit?.base === suggested ? edit.text : suggested;
  const text = withGuestLink(message, url);
  const status = rsvpShareStatus(availability, closesOn);

  // Publishing replaces the button the couple pressed, so move focus (and the view) to the link they can now share.
  useEffect(() => { if (justPublished) heading.current?.focus(); }, [justPublished]);

  async function share() {
    setFeedback(null);
    try {
      await navigator.share({ text });
    } catch (error) {
      // Closing the share sheet is neither a failure nor a success.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback({ ok: false, text: "Sharing didn’t work on this device. Use Copy message instead." });
    }
  }

  async function copy(value: string, what: "message" | "link") {
    setFeedback(null);
    setFeedback(await copyText(value)
      ? { ok: true, text: what === "link" ? "Link copied." : "Message copied." }
      : { ok: false, text: `We couldn’t copy the ${what}. Select it above and copy it manually.` });
  }

  return <section id="guest-link" className="ws-panel" aria-labelledby="guest-link-title">
    <div className="ws-panel-head">
      <h2 id="guest-link-title" ref={heading} tabIndex={-1}>Your guest link</h2>
      <p className="flex flex-wrap gap-2"><span className="badge badge-positive badge-dot">Live</span><span className={availability === "open" ? "badge badge-positive" : "badge"}>{status.label}</span></p>
    </div>
    {justPublished && <p className="form-notice mt-4" role="status">Your wedding site is published. Share your guest link with your guests.</p>}
    <p className="guest-link-url font-mono" translate="no">{url}</p>
    <p className="mt-2"><a href={url} target="_blank" rel="noopener noreferrer" className="text-link text-sm">Open your site<span className="sr-only"> (opens in a new tab)</span></a></p>
    <p className="ws-panel-intro">{status.note}{availability === "off" && <> <Link href="/dashboard/rsvp" className="text-link">Open RSVPs</Link></>}</p>
    <p className="ws-panel-intro">This one link opens your Save the Date, Details and RSVP pages. Anyone who has it can view your site{availability === "open" ? " and reply" : ""}, so share it only with your guests. To stop it working, <Link href="/dashboard/rsvp" className="text-link">replace it in RSVP</Link>.</p>

    <label htmlFor="share-message" className="field-label mt-6">Message to send</label>
    <textarea id="share-message" className="field-input guest-share-message" rows={5} value={message} onChange={(event) => setEdit({ base: suggested, text: event.target.value })} aria-describedby="share-message-help" />
    <p id="share-message-help" className="field-help">Edit it before sharing. We don’t save this message, and your full guest link is added if it’s missing.</p>
    {message !== suggested && <button type="button" className="button button-quiet button-flush mt-1" onClick={() => setEdit(null)}>Restore suggested message</button>}
    <div className="guest-share-actions">
      {nativeShare && <button type="button" className="button button-primary" onClick={share}><Icon name="share" />Share</button>}
      <a href={whatsAppHref(text)} target="_blank" rel="noopener noreferrer" className={`button ${nativeShare ? "button-secondary" : "button-primary"}`}><Icon name="message" />Share on WhatsApp<span className="sr-only"> (opens WhatsApp in a new tab)</span></a>
      <button type="button" className="button button-secondary" onClick={() => copy(text, "message")}><Icon name="copy" />Copy message</button>
      <button type="button" className="button button-secondary" onClick={() => copy(url, "link")}><Icon name="link" />Copy link</button>
    </div>
    <p className="field-help" role="status">{feedback?.ok ? feedback.text : ""}</p>
    {feedback && !feedback.ok && <p className="field-error" role="alert">{feedback.text}</p>}
  </section>;
}
