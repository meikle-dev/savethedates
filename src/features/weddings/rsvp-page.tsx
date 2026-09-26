"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { GuestHrefs } from "./guest-link";
import type { RsvpState } from "./rsvp";
import type { WeddingTheme } from "./themes";
import { rsvpDeadline } from "./wedding";
import { submitSharedRsvp } from "@/features/workspace/rsvp-actions";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { BotanicalArt } from "./wedding-art";

type RsvpWedding = { first_name: string; second_name: string; theme: WeddingTheme; details_enabled: boolean; rsvp_enabled: boolean; invitation_enabled: boolean };
type InvitationProps = { wedding: RsvpWedding; hrefs: GuestHrefs; open: boolean; closesOn: string | null; secret: string | null; previewNote: string; focusName: boolean; onReplyAgain: () => void };

const ownerPreviewNote = "Preview only. No response will be saved. Open your guest link from the workspace to see the guest page.";

// Guests reach this page only through a valid guest link (other links are 404), so it shows the form or a closed
// state. The owner preview passes no secret and never submits. `closesOn` is the saved closing date while RSVP is
// enabled (null when there is none); `open` is the database's own verdict, so the page never uses the visitor's clock.
// Marketing examples also pass no secret, with their own `previewNote`.
export function RsvpPage({ wedding, hrefs, open, closesOn = null, secret, previewNote = ownerPreviewNote }: { wedding: RsvpWedding; hrefs: GuestHrefs; open: boolean; closesOn?: string | null; secret: string | null; previewNote?: string }) {
  // "Reply for someone else" remounts the invitation: a fresh, empty form with no memory of the previous reply.
  const [attempt, setAttempt] = useState(0);
  const preview = secret === null;
  const rsvpHref = preview || wedding.rsvp_enabled ? hrefs.rsvp : undefined;
  const names = [wedding.first_name, wedding.second_name] as const;
  return <WeddingFrame theme={wedding.theme} className="details-shell rsvp-shell">
    <WeddingHeader names={names} homeHref={hrefs.home} invitationHref={wedding.invitation_enabled ? hrefs.invitation : undefined} detailsHref={wedding.details_enabled ? hrefs.details : undefined} rsvpHref={rsvpHref} current="rsvp" />
    <main id="main" className="rsvp-main">
      <RsvpInvitation key={attempt} wedding={wedding} hrefs={hrefs} open={open} closesOn={closesOn} secret={secret} previewNote={previewNote} focusName={attempt > 0} onReplyAgain={() => setAttempt((value) => value + 1)} />
    </main>
    <WeddingFooter names={names} />
  </WeddingFrame>;
}

function RsvpInvitation({ wedding, hrefs, open, closesOn, secret, previewNote, focusName, onReplyAgain }: InvitationProps) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(submitSharedRsvp, {});
  const preview = secret === null;
  const deadline = closesOn ? rsvpDeadline(closesOn) : null;
  const closedByDate = wedding.rsvp_enabled && !!deadline;
  const done = open && !!state.success;
  const thanks = useRef<HTMLHeadingElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const cardState = !open ? "closed" : done ? "success" : "form";
  // The form is replaced on success, so move focus to the confirmation; a new reply starts at the name field.
  useEffect(() => { if (done) thanks.current?.focus(); }, [done]);
  useEffect(() => { if (focusName) nameField.current?.focus(); }, [focusName]);
  const context = !open ? (closedByDate ? "Replies have now closed." : "Replies aren’t open.")
    : done ? "Your reply has been sent."
    : deadline ? `Please reply by ${deadline.date}.`
    : preview ? "Guests enter their own name to reply with your guest link." : "Please let us know if you can join us.";
  const nameErrors = state.errors?.responding_name;
  return <>
    <div className="rsvp-intro">
      <div className="rsvp-intro-art" aria-hidden="true"><BotanicalArt /></div>
      <span className="rsvp-ornament" aria-hidden="true">♥</span>
      <p className="details-kicker">Will you join us?</p>
      <h1 className="editorial">RSVP</h1>
      <p className="rsvp-invitation-context">{context}</p>
      {open && !done && deadline && <p className="rsvp-deadline">Replies close at {deadline.exact}.</p>}
    </div>
    <section className="rsvp-card" data-state={cardState} aria-label="Invitation response">
      <div className="rsvp-card-art"><BotanicalArt /></div>
      {!open ? <div className="rsvp-state">
        <h2 className="editorial text-2xl">{closedByDate ? "RSVPs have closed" : "RSVPs aren’t open"}</h2>
        <p className="mt-3 leading-relaxed">{closedByDate ? `Replies closed at ${deadline!.exact}. Contact the couple if your plans have changed.` : "The couple isn’t taking replies here. Contact them directly if you need to reply or your plans have changed."}</p>
      </div> : done ? <div className="rsvp-state" role="status">
        <h2 ref={thanks} tabIndex={-1} className="editorial text-2xl">Thank you</h2>
        <p className="form-notice mt-5">{state.message}</p>
        <p className="mt-4 leading-relaxed">To change it, contact the couple. This link can’t show or edit saved replies.</p>
        <div className="rsvp-next">
          <button type="button" className="rsvp-again" onClick={onReplyAgain}>Reply for someone else</button>
          {wedding.details_enabled && <Link href={hrefs.details} className="rsvp-next-link">View the wedding details</Link>}
        </div>
      </div> : <form action={preview ? undefined : action} onSubmit={preview ? (event) => event.preventDefault() : undefined} noValidate>
        {!preview && <input type="hidden" name="secret" value={secret} />}
        <div>
          <label className="field-label" htmlFor="responding_name">Your name</label>
          <input ref={nameField} id="responding_name" name="responding_name" className="field-input" maxLength={80} autoComplete="name" defaultValue={state.values?.responding_name ?? ""} aria-invalid={!!nameErrors} aria-describedby={nameErrors ? "responding-name-error responding-name-help" : "responding-name-help"} />
          {nameErrors && <p id="responding-name-error" className="field-error">{nameErrors[0]}</p>}
          <p id="responding-name-help" className="rsvp-field-help">Replying for more than one person? Send one reply each.</p>
        </div>
        <fieldset className="rsvp-attendance" aria-invalid={!!state.errors?.attending} aria-describedby={state.errors?.attending ? "attendance-error" : undefined}>
          <legend className="field-label">Can you attend?</legend>
          <div className="rsvp-choices">
            <label className="rsvp-choice"><input type="radio" name="attending" value="yes" defaultChecked={state.values?.attending === "yes"} /><span>Joyfully accepts</span></label>
            <label className="rsvp-choice"><input type="radio" name="attending" value="no" defaultChecked={state.values?.attending === "no"} /><span>Regretfully declines</span></label>
          </div>
          {state.errors?.attending && <p id="attendance-error" className="field-error">{state.errors.attending[0]}</p>}
        </fieldset>
        {state.message && <p className="mt-5 form-error" role="alert">{state.message}</p>}
        <button className="rsvp-submit" disabled={pending || preview} aria-busy={pending || undefined}>{pending ? "Saving…" : "Send RSVP"}<span aria-hidden="true">→</span></button>
        <p className="rsvp-privacy">{preview ? previewNote : "Your answer is private to the couple. Contact them to correct it; this link cannot show or edit saved answers."}</p>
      </form>}
    </section>
  </>;
}
