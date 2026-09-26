"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { GuestHrefs } from "./guest-link";
import type { RsvpState } from "./rsvp";
import { courseWords, dietaryChoices, maxDietaryOtherLength, maxMealOptionLength, mealErrorKey, shownCourses, type MealMenu } from "./meal-menu";
import type { WeddingTheme } from "./themes";
import { rsvpDeadline } from "./wedding";
import { submitSharedRsvp } from "@/features/workspace/rsvp-actions";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { BotanicalArt } from "./wedding-art";

type RsvpWedding = { first_name: string; second_name: string; theme: WeddingTheme; details_enabled: boolean; rsvp_enabled: boolean; invitation_enabled: boolean };
type InvitationProps = { wedding: RsvpWedding; hrefs: GuestHrefs; open: boolean; closesOn: string | null; secret: string | null; menu: MealMenu | null; previewNote: string; focusName: boolean; onReplyAgain: () => void };

const ownerPreviewNote = "Preview only. No response will be saved. Open your guest link from the workspace to see the guest page.";

// Guests reach this page only through a valid guest link (other links are 404), so it shows the form or a closed
// state. The owner preview passes no secret and never submits. `closesOn` is the saved closing date while RSVP is
// enabled (null when there is none); `open` is the database's own verdict, so the page never uses the visitor's clock.
// Marketing examples also pass no secret, with their own `previewNote`. `menu` holds only the courses guests choose
// from (null while meal choices are off); food preferences are always asked of attending guests.
export function RsvpPage({ wedding, hrefs, open, closesOn = null, secret, menu = null, previewNote = ownerPreviewNote }: { wedding: RsvpWedding; hrefs: GuestHrefs; open: boolean; closesOn?: string | null; secret: string | null; menu?: MealMenu | null; previewNote?: string }) {
  // "Reply for someone else" remounts the invitation: a fresh, empty form with no memory of the previous reply.
  const [attempt, setAttempt] = useState(0);
  const preview = secret === null;
  const rsvpHref = preview || wedding.rsvp_enabled ? hrefs.rsvp : undefined;
  const names = [wedding.first_name, wedding.second_name] as const;
  return <WeddingFrame theme={wedding.theme} className="details-shell rsvp-shell">
    <WeddingHeader names={names} homeHref={hrefs.home} invitationHref={wedding.invitation_enabled ? hrefs.invitation : undefined} detailsHref={wedding.details_enabled ? hrefs.details : undefined} rsvpHref={rsvpHref} current="rsvp" />
    <main id="main" className="rsvp-main">
      <RsvpInvitation key={attempt} wedding={wedding} hrefs={hrefs} open={open} closesOn={closesOn} secret={secret} menu={menu} previewNote={previewNote} focusName={attempt > 0} onReplyAgain={() => setAttempt((value) => value + 1)} />
    </main>
    <WeddingFooter names={names} />
  </WeddingFrame>;
}

/** Disables the food questions the guest can't currently see, from the form's real checked state. */
function syncFoodFields(form: HTMLFormElement) {
  const attending = !!form.querySelector('input[name="attending"][value="yes"]:checked');
  const other = !!form.querySelector('input[name="dietary"][value="other"]:checked');
  for (const fieldset of form.querySelectorAll<HTMLFieldSetElement>(".rsvp-food > fieldset")) fieldset.disabled = !attending;
  const otherText = form.querySelector<HTMLInputElement>("#dietary_other");
  if (otherText) otherText.disabled = !other;
}

function RsvpInvitation({ wedding, hrefs, open, closesOn, secret, menu: pageMenu, previewNote, focusName, onReplyAgain }: InvitationProps) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(submitSharedRsvp, {});
  // A rejection caused by the couple changing their menu returns the current one.
  const menu = state.menuUpdate ? state.menuUpdate.menu : pageMenu;
  const form = useRef<HTMLFormElement>(null);
  // The food questions are revealed by CSS on the real radio and checkbox, so they work before hydration and without
  // JavaScript. Once hydrated, hidden questions are also disabled, so a "No" (or an unticked Other) sends nothing.
  // Disabling follows the form's actual checked state, never a copy in React state: a browser that restores
  // "Joyfully accepts" on reload or from the back/forward cache fires no change event.
  useEffect(() => {
    const current = form.current;
    if (!current) return;
    const sync = () => syncFoodFields(current);
    sync();
    current.addEventListener("change", sync);
    addEventListener("pageshow", sync);
    return () => {
      current.removeEventListener("change", sync);
      removeEventListener("pageshow", sync);
    };
  });
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
  // After a rejected submission, focus the first invalid control (a fieldset's first available choice).
  useEffect(() => {
    if (state.success || !state.errors) return;
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid?.matches("fieldset") ? invalid.querySelector<HTMLElement>("input:not(:disabled)") : invalid)?.focus();
  }, [state]);
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
        {state.choices && <div className="rsvp-your-choices">
          <h3>Your choices</h3>
          <ul>{state.choices.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>}
        <p className="mt-4 leading-relaxed">To change it, contact the couple. This link can’t show or edit saved replies.</p>
        <div className="rsvp-next">
          <button type="button" className="rsvp-again" onClick={onReplyAgain}>Reply for someone else</button>
          {wedding.details_enabled && <Link href={hrefs.details} className="rsvp-next-link">View the wedding details</Link>}
        </div>
      </div> : <form ref={form} action={preview ? undefined : action} onSubmit={preview ? (event) => event.preventDefault() : undefined} noValidate>
        {!preview && <input type="hidden" name="secret" value={secret} />}
        {menu && <input type="hidden" name="meal_menu" value={JSON.stringify(menu)} />}
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
        <div className="rsvp-food">
          {shownCourses(menu).map((course) => {
            const error = state.errors?.[mealErrorKey(course)]?.[0];
            return <fieldset key={course} className="rsvp-course" aria-invalid={!!error} aria-describedby={error ? `meal-${course}-error` : undefined}>
              <legend className="field-label">Choose your {courseWords[course].one}</legend>
              <div className="rsvp-options">
                {menu![course].map((option) => <label key={option.id} className="rsvp-choice rsvp-option"><input type="radio" name={mealErrorKey(course)} value={option.id} defaultChecked={state.values?.meals?.[course] === option.id} /><span>{option.label.slice(0, maxMealOptionLength)}</span></label>)}
              </div>
              {error && <p id={`meal-${course}-error`} className="field-error">{error}</p>}
            </fieldset>;
          })}
          <fieldset className="rsvp-dietary" aria-describedby="dietary-hint dietary-privacy">
            <legend className="field-label">Any food preferences?</legend>
            <p id="dietary-hint" className="rsvp-field-help rsvp-dietary-hint">Tick any that apply, or leave blank if none.</p>
            <p id="dietary-privacy" className="rsvp-field-help">Only {wedding.first_name} and {wedding.second_name} will see this.</p>
            <div className="rsvp-options rsvp-dietary-options">
              {dietaryChoices.map(({ value, label }) => <label key={value} className="rsvp-choice rsvp-option"><input type="checkbox" name="dietary" value={value} defaultChecked={!!state.values?.dietary?.includes(value)} /><span>{label}</span></label>)}
            </div>
            <div className="rsvp-other">
              <label htmlFor="dietary_other" className="rsvp-other-label">Your other food preference</label>
              <input id="dietary_other" name="dietary_other" className="field-input" maxLength={maxDietaryOtherLength} autoComplete="off" defaultValue={state.values?.dietary_other ?? ""} aria-invalid={!!state.errors?.dietary_other} aria-describedby={state.errors?.dietary_other ? "dietary-other-help dietary-other-error" : "dietary-other-help"} />
              <p id="dietary-other-help" className="rsvp-field-help">For example ‘no pork’ or ‘no mushrooms’.</p>
              {state.errors?.dietary_other && <p id="dietary-other-error" className="field-error">{state.errors.dietary_other[0]}</p>}
            </div>
          </fieldset>
        </div>
        {state.message && <p className="mt-5 form-error" role="alert">{state.message}</p>}
        <button className="rsvp-submit" disabled={pending || preview} aria-busy={pending || undefined}>{pending ? "Saving…" : "Send RSVP"}<span aria-hidden="true">→</span></button>
        <p className="rsvp-privacy">{preview ? previewNote : "Your answer is private to the couple. Contact them to correct it; this link cannot show or edit saved answers."}</p>
      </form>}
    </section>
  </>;
}
