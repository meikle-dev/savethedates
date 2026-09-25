"use client";

import { useActionState } from "react";
import type { GuestHrefs } from "./guest-link";
import type { RsvpState } from "./rsvp";
import type { WeddingTheme } from "./themes";
import { submitSharedRsvp } from "@/features/workspace/rsvp-actions";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { BotanicalArt } from "./wedding-art";

// Guests reach this page only through a valid guest link (other links are 404), so it shows the form or a closed
// state. The owner preview passes no secret and never submits.
export function RsvpPage({ wedding, hrefs, open, secret }: { wedding: { first_name: string; second_name: string; theme: WeddingTheme; details_enabled: boolean; rsvp_enabled: boolean }; hrefs: GuestHrefs; open: boolean; secret: string | null }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(submitSharedRsvp, {});
  const preview = secret === null;
  const rsvpHref = preview || wedding.rsvp_enabled ? hrefs.rsvp : undefined;
  const names = [wedding.first_name, wedding.second_name] as const;
  const cardState = !open ? "closed" : "form";
  return <WeddingFrame theme={wedding.theme} className="details-shell rsvp-shell">
    <WeddingHeader names={names} homeHref={hrefs.home} detailsHref={wedding.details_enabled ? hrefs.details : undefined} rsvpHref={rsvpHref} current="rsvp" />
    <main id="main" className="rsvp-main">
      <div className="rsvp-intro">
        <div className="rsvp-intro-art" aria-hidden="true"><BotanicalArt /></div>
        <span className="rsvp-ornament" aria-hidden="true">♥</span>
        <p className="details-kicker">Will you join us?</p>
        <h1 className="editorial">RSVP</h1>
        <p className="rsvp-invitation-context">{preview ? "Guests enter their names to RSVP with your guest link." : "Please enter your name and answer below."}</p>
      </div>
      <section className="rsvp-card" data-state={cardState} aria-label="Invitation response">
        <div className="rsvp-card-art"><BotanicalArt /></div>
        {!open ? <div className="rsvp-state">
          <h2 className="editorial text-2xl">RSVP is closed</h2>
          <p className="mt-3 leading-relaxed">Contact the couple if your plans have changed.</p>
        </div> : state.success ? <div className="rsvp-state" role="status"><h2 className="editorial text-2xl">Thank you</h2><p className="form-notice mt-5">{state.message}</p></div> : <form action={preview ? undefined : action} onSubmit={preview ? (event) => event.preventDefault() : undefined} noValidate>
          {!preview && <input type="hidden" name="secret" value={secret} />}
          <div>
            <label className="field-label" htmlFor="responding_name">Your name</label>
            <input id="responding_name" name="responding_name" className="field-input" maxLength={80} defaultValue="" aria-invalid={!!state.errors?.responding_name} aria-describedby={state.errors?.responding_name ? "responding-name-error" : undefined} />
            {state.errors?.responding_name && <p id="responding-name-error" className="field-error">{state.errors.responding_name[0]}</p>}
          </div>
          <fieldset className="rsvp-attendance" aria-invalid={!!state.errors?.attending} aria-describedby={state.errors?.attending ? "attendance-error" : undefined}>
            <legend className="field-label">Can you attend?</legend>
            <div className="rsvp-choices">
              <label className="rsvp-choice"><input type="radio" name="attending" value="yes" /><span>Joyfully accepts</span></label>
              <label className="rsvp-choice"><input type="radio" name="attending" value="no" /><span>Regretfully declines</span></label>
            </div>
            {state.errors?.attending && <p id="attendance-error" className="field-error">{state.errors.attending[0]}</p>}
          </fieldset>
          {state.message && <p className={`mt-5 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
          <button className="rsvp-submit" disabled={pending || preview} aria-busy={pending || undefined}>{pending ? "Saving…" : "Send RSVP"}<span aria-hidden="true">→</span></button>
          <p className="rsvp-privacy">{preview ? "Preview only. No response will be saved. Open your guest link from the workspace to see the guest page." : "Your answer is private to the couple. Contact them to correct it; this link cannot show or edit saved answers."}</p>
        </form>}
      </section>
    </main>
    <WeddingFooter names={names} />
  </WeddingFrame>;
}
