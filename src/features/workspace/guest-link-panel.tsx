"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { GuestLinkKind } from "@/features/weddings/guest-link";
import type { RsvpState } from "@/features/weddings/rsvp";
import { copyText } from "./copy-link-button";
import { rotateGuestLink } from "./rsvp-actions";
import { rsvpShareStatus, whatsAppHref, withGuestLink } from "./share-message";
import { Icon } from "./workspace-icons";
import type { RsvpAvailability } from "./workspace-summary";

type ShareLink = { url: string; message: string };
export type GuestShares = {
  availability: RsvpAvailability;
  closesOn: string | null;
  rsvpVia: GuestLinkKind;
  on: { details: boolean; rsvp: boolean };
  saveTheDate: ShareLink;
  invitation: ShareLink | null;
  rsvp: ShareLink | null;
};

const noSubscription = () => () => {};
const nativeShareSupported = () => typeof navigator.share === "function";
const linkNames = { save_the_date: "Save the Date link", invitation: "Invitation link" } as const;

/** "Save the Date, Details and RSVP": the pages one link opens, in guest order. */
function pageList(first: string, details: boolean, rsvp: boolean) {
  const pages = [first, details && "Details", rsvp && "RSVP"].filter(Boolean) as string[];
  return pages.length > 1 ? `${pages.slice(0, -1).join(", ")} and ${pages.at(-1)}` : pages[0];
}

// F042/F065: the live site's links in sending order, shown the same way in Publish and the Overview. Render only while
// the site is live; drafts, unpublished and expired sites never get these panels. Every action is started by the
// couple, and a link goes only to the destination they choose (the share sheet, WhatsApp or their clipboard).
export function GuestLinkPanels({ shares, justPublished = false }: { shares: GuestShares; justPublished?: boolean }) {
  const { availability, closesOn, rsvpVia, on } = shares;
  const status = rsvpShareStatus(availability, closesOn);
  const stdReplies = rsvpVia === "save_the_date" && availability === "open";
  return <div className="ws-stack">
    <SharePanel id="guest-link" title="Send your Save the Date" share={shares.saveTheDate} focus={justPublished}
      badges={<span className="badge badge-positive badge-dot">Live</span>}
      intro={<>Opens your {pageList("Save the Date", on.details, rsvpVia === "save_the_date" && on.rsvp)}{rsvpVia === "invitation" ? ", but never your Invitation" : ""}. Anyone who has it can view these pages{stdReplies ? " and reply" : ""}, so share it only with your guests.</>}
      replace="save_the_date">
      {justPublished && <p className="form-notice mt-4" role="status">Your wedding site is published. Send your Save the Date when you’re ready.</p>}
    </SharePanel>

    {shares.invitation
      ? <SharePanel id="invitation-link" title="Send your Invitation" share={shares.invitation}
        intro={<>A separate link, usually sent later. It opens your {pageList("Invitation", on.details, on.rsvp)}, but not your Save the Date. Anyone who has it can view these pages{availability === "open" ? " and reply" : ""}.</>}
        replace="invitation" />
      : <section id="invitation-link" className="ws-panel" aria-labelledby="invitation-link-title">
        <h2 id="invitation-link-title">Send your Invitation</h2>
        <p className="ws-panel-intro">Your Invitation is off. When you’re ready to invite your guests, <Link href="/dashboard/invitation" className="text-link">switch on your Invitation</Link> to get its own link.</p>
      </section>}

    {shares.rsvp
      ? <SharePanel id="rsvp-link" title="Send your RSVP link" share={shares.rsvp}
        badges={<span className="badge badge-positive">{status.label}</span>}
        intro={<>Opens your RSVP page directly, to ask for replies or chase late ones. {status.note} It’s part of your {linkNames[rsvpVia]}, so replacing that link replaces this one too.</>} />
      : <section id="rsvp-link" className="ws-panel" aria-labelledby="rsvp-link-title">
        <div className="ws-panel-head"><h2 id="rsvp-link-title">Send your RSVP link</h2><span className="badge">{status.label}</span></div>
        <p className="ws-panel-intro">{status.note} <Link href="/dashboard/rsvp" className="text-link">{availability === "off" ? "Open RSVPs" : "RSVP settings"}</Link></p>
      </section>}
  </div>;
}

function SharePanel({ id, title, share, intro, badges, replace, focus = false, children }: { id: string; title: string; share: ShareLink; intro: React.ReactNode; badges?: React.ReactNode; replace?: GuestLinkKind; focus?: boolean; children?: React.ReactNode }) {
  const { url, message: suggested } = share;
  // An edit belongs to the suggestion it was made from, so a renamed or replaced link shows the new suggestion.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const nativeShare = useSyncExternalStore(noSubscription, nativeShareSupported, () => false);
  const heading = useRef<HTMLHeadingElement>(null);
  const message = edit?.base === suggested ? edit.text : suggested;
  const text = withGuestLink(message, url);

  // Publishing replaces the button the couple pressed, so move focus (and the view) to the link they can now share.
  useEffect(() => { if (focus) heading.current?.focus(); }, [focus]);

  async function nativeShareText() {
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

  return <section id={id} className="ws-panel" aria-labelledby={`${id}-title`}>
    <div className="ws-panel-head">
      <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>{title}</h2>
      {badges && <p className="flex flex-wrap gap-2">{badges}</p>}
    </div>
    {children}
    <p className="guest-link-url font-mono" translate="no">{url}</p>
    <p className="mt-2"><a href={url} target="_blank" rel="noopener noreferrer" className="text-link text-sm">Open this link<span className="sr-only"> (opens in a new tab)</span></a></p>
    <p className="ws-panel-intro">{intro}</p>

    <label htmlFor={`${id}-message`} className="field-label mt-6">Message to send</label>
    <textarea id={`${id}-message`} className="field-input guest-share-message" rows={4} value={message} onChange={(event) => setEdit({ base: suggested, text: event.target.value })} aria-describedby={`${id}-message-help`} />
    <p id={`${id}-message-help`} className="field-help">Edit it before sharing. We don’t save this message, and the full link is added if it’s missing.</p>
    {message !== suggested && <button type="button" className="button button-quiet button-flush mt-1" onClick={() => setEdit(null)}>Restore suggested message</button>}
    <div className="guest-share-actions">
      {nativeShare && <button type="button" className="button button-primary" onClick={nativeShareText}><Icon name="share" />Share</button>}
      <a href={whatsAppHref(text)} target="_blank" rel="noopener noreferrer" className={`button ${nativeShare ? "button-secondary" : "button-primary"}`}><Icon name="message" />Share on WhatsApp<span className="sr-only"> (opens WhatsApp in a new tab)</span></a>
      <button type="button" className="button button-secondary" onClick={() => copy(text, "message")}><Icon name="copy" />Copy message</button>
      <button type="button" className="button button-secondary" onClick={() => copy(url, "link")}><Icon name="link" />Copy link</button>
    </div>
    <p className="field-help" role="status">{feedback?.ok ? feedback.text : ""}</p>
    {feedback && !feedback.ok && <p className="field-error" role="alert">{feedback.text}</p>}
    {replace && <ReplaceLinkForm link={replace} />}
  </section>;
}

/** F065: replaces one link after an explicit confirmation. The other link and saved replies are unchanged. */
export function ReplaceLinkForm({ link }: { link: GuestLinkKind }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(rotateGuestLink, {});
  const name = linkNames[link];
  return <details className="guest-link-replace" open={!!state.message || undefined}>
    <summary>Replace this link</summary>
    <form action={action}>
      <input type="hidden" name="link" value={link} />
      <p className="text-sm leading-relaxed">Replacing gives your {name} a new private address, so the one you sent before stops working. Your other link and saved replies aren’t affected.</p>
      <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_rotate" value="yes" required /><span>Replace my {name} and stop the old one working</span></label>
      <button className="button button-secondary mt-3" disabled={pending}>{pending ? "Replacing…" : `Replace ${name}`}</button>
      {state.message && <p className={state.success ? "form-notice" : "form-error"} role={state.success ? "status" : "alert"}>{state.message}</p>}
    </form>
  </details>;
}
