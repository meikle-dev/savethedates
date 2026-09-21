"use client";

import { useActionState } from "react";
import type { GuestRsvp, RsvpState } from "./rsvp";
import { submitRsvp } from "@/features/workspace/rsvp-actions";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { OliveBranch } from "./wedding-art";

export function RsvpPage({ wedding, guest, slug, token }: { wedding: { first_name: string; second_name: string; theme: GuestRsvp["theme"]; details_enabled: boolean; rsvp_enabled: boolean }; guest: GuestRsvp | null; slug: string; token: string | null }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(submitRsvp, {});
  const respondingName = state.respondingName ?? guest?.responding_name ?? "";
  const attending = state.attending ?? guest?.attending;
  const unavailable = !token || !guest;
  const open = !!guest?.is_open;
  const rsvpHref = wedding.rsvp_enabled ? `/${slug}/rsvp${token ? `?invite=${token}` : ""}` : undefined;
  const names = [wedding.first_name, wedding.second_name] as const;
  return <WeddingFrame theme={wedding.theme} className="details-shell rsvp-shell">
    <WeddingHeader names={names} homeHref={`/${slug}`} detailsHref={wedding.details_enabled ? `/${slug}/details` : undefined} rsvpHref={rsvpHref} current="rsvp" />
    <main id="main" className="rsvp-main">
      <OliveBranch />
      <div className="details-intro">
        <p className="details-kicker">Will you join us?</p>
        <h1 className="editorial">RSVP</h1>
        <p>{unavailable ? "Open the private invitation link sent by the couple to respond." : `This invitation is for ${guest.invite_name}.`}</p>
      </div>
      <section className="rsvp-card">
        {unavailable ? <p className="form-error">This RSVP link is unavailable. Ask the couple for a current private link.</p> : !open ? <div>
          <h2 className="editorial text-2xl">RSVP is closed</h2>
          <p className="mt-3 leading-relaxed">Contact the couple if your plans have changed.</p>
          {guest.responding_name && <p className="form-notice mt-5">Saved response: {guest.responding_name} · {guest.attending ? "Attending" : "Not attending"}</p>}
        </div> : <form action={action} noValidate>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="token" value={token} />
          {guest.responding_name && <p className="form-notice mb-5">A response is already saved. Submit again to update it.</p>}
          <div>
            <label className="field-label" htmlFor="responding_name">Your name</label>
            <input id="responding_name" name="responding_name" className="field-input" maxLength={80} defaultValue={respondingName} aria-invalid={!!state.errors?.responding_name} aria-describedby={state.errors?.responding_name ? "responding-name-error" : undefined} />
            {state.errors?.responding_name && <p id="responding-name-error" className="field-error">{state.errors.responding_name[0]}</p>}
          </div>
          <fieldset className="mt-6" aria-invalid={!!state.errors?.attending} aria-describedby={state.errors?.attending ? "attendance-error" : undefined}>
            <legend className="field-label">Can you attend?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rsvp-choice"><input type="radio" name="attending" value="yes" defaultChecked={attending === true} /><span>Joyfully accepts</span></label>
              <label className="rsvp-choice"><input type="radio" name="attending" value="no" defaultChecked={attending === false} /><span>Regretfully declines</span></label>
            </div>
            {state.errors?.attending && <p id="attendance-error" className="field-error">{state.errors.attending[0]}</p>}
          </fieldset>
          {state.message && <p className={`mt-5 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
          <button className="rsvp-submit mt-6" disabled={pending}>{pending ? "Saving…" : guest.responding_name ? "Update RSVP" : "Send RSVP"}</button>
          <p className="mt-4 text-xs leading-relaxed opacity-75">Keep this private link if you need to correct your response. It identifies this invitation, not your real-world identity.</p>
        </form>}
      </section>
    </main>
    <WeddingFooter names={names} />
  </WeddingFrame>;
}
