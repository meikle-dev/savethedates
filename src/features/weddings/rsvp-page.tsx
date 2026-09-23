"use client";

import { useActionState } from "react";
import { weddingJourneyHrefs } from "./invitation-context";
import type { RsvpState } from "./rsvp";
import type { WeddingTheme } from "./themes";
import { submitSharedRsvp } from "@/features/workspace/rsvp-actions";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { BotanicalArt } from "./wedding-art";

export function RsvpPage({ wedding, access, slug, sharedSecret, previewHrefs }: { wedding: { first_name: string; second_name: string; theme: WeddingTheme; details_enabled: boolean; rsvp_enabled: boolean }; access: { is_open: boolean } | null; slug: string; sharedSecret?: string | null; previewHrefs?: ReturnType<typeof weddingJourneyHrefs> }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(submitSharedRsvp, {});
  const unavailable = !previewHrefs && (!sharedSecret || !access);
  const open = !!previewHrefs || !!access?.is_open;
  const hrefs = previewHrefs ?? weddingJourneyHrefs(slug, sharedSecret);
  const rsvpHref = previewHrefs || wedding.rsvp_enabled ? hrefs.rsvp : undefined;
  const names = [wedding.first_name, wedding.second_name] as const;
  const cardState = unavailable ? "unavailable" : !open ? "closed" : "form";
  return <WeddingFrame theme={wedding.theme} className="details-shell rsvp-shell">
    <WeddingHeader names={names} homeHref={hrefs.home} detailsHref={wedding.details_enabled ? hrefs.details : undefined} rsvpHref={rsvpHref} current="rsvp" />
    <main id="main" className="rsvp-main">
      <div className="rsvp-intro">
        <div className="rsvp-intro-art" aria-hidden="true"><BotanicalArt /></div>
        <span className="rsvp-ornament" aria-hidden="true">♥</span>
        <p className="details-kicker">Will you join us?</p>
        <h1 className="editorial">RSVP</h1>
        <p className="rsvp-invitation-context">{previewHrefs ? "Guests enter their names to RSVP with your shared link." : unavailable ? "Open the private RSVP link sent by the couple to respond." : "Please enter your name and answer below."}</p>
      </div>
      <section className="rsvp-card" data-state={cardState} aria-label="Invitation response">
        <div className="rsvp-card-art"><BotanicalArt /></div>
        {unavailable ? <div className="rsvp-state">
          <h2 className="editorial">Invitation unavailable</h2>
          <p className="form-error">This RSVP link is unavailable. Ask the couple for a current private link.</p>
        </div> : !open ? <div className="rsvp-state">
          <h2 className="editorial text-2xl">RSVP is closed</h2>
          <p className="mt-3 leading-relaxed">Contact the couple if your plans have changed.</p>
        </div> : state.success ? <div className="rsvp-state" role="status"><h2 className="editorial text-2xl">Thank you</h2><p className="form-notice mt-5">{state.message}</p></div> : <form action={previewHrefs ? undefined : action} onSubmit={previewHrefs ? (event) => event.preventDefault() : undefined} noValidate>
          {!previewHrefs && <><input type="hidden" name="slug" value={slug} /><input type="hidden" name="secret" value={sharedSecret ?? ""} /></>}
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
          <button className="rsvp-submit" disabled={pending || !!previewHrefs} aria-busy={pending || undefined}>{pending ? "Saving…" : "Send RSVP"}<span aria-hidden="true">→</span></button>
          <p className="rsvp-privacy">{previewHrefs ? "Preview only. No response will be saved. Open your shared RSVP link from the workspace to see the guest page." : "Your answer is private to the couple. Contact them to correct it; this shared link cannot show or edit saved answers."}</p>
        </form>}
      </section>
    </main>
    <WeddingFooter names={names} />
  </WeddingFrame>;
}
