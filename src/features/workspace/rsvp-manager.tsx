"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { RsvpState } from "@/features/weddings/rsvp";
import { rotateSharedRsvp, saveRsvpSettings } from "./rsvp-actions";
import { CopyLinkButton } from "./copy-link-button";
import { Icon } from "./workspace-icons";
import type { RsvpReadiness } from "./workspace-data";

// The RSVP section shows the same current guest link as Publish and the Overview. It keeps RSVP settings and link
// replacement; replacing refreshes every workspace page, so this display comes from the page's props alone. `status`
// is computed on the server from saved settings, so it is already current when a save's notice appears.
export function RsvpManager({ enabled, closesOn, guestUrl, live, status }: { enabled: boolean; closesOn: string | null; guestUrl: string; live: boolean; status: RsvpReadiness }) {
  const [settings, settingsAction, settingsPending] = useActionState<RsvpState, FormData>(saveRsvpSettings, {});
  const [rotated, rotateAction, rotatePending] = useActionState<RsvpState, FormData>(rotateSharedRsvp, {});

  return <div className="ws-stack">
    <section className="ws-panel" aria-labelledby="rsvp-link-title">
      <h2 id="rsvp-link-title">Your guest link</h2>
      <p className="ws-panel-intro">{status.availability === "offline" ? "This is your existing guest link. It will work again if you purchase a new site period. Guests cannot view the site or reply while it is offline." : live ? `Share this one link with your guests. ${status.availability === "open" ? "Guests enter their own names and send one reply each; only you can see responses. They should contact you if plans change." : "They can view your site, but cannot reply while RSVPs aren’t open."}` : "This will be your guest link. It works once your site is published; share it then. Guests enter their own names and send one reply each when RSVPs are open."}</p>
      <p id="rsvp-guest-link" className="guest-link-url font-mono" data-pending={live ? undefined : ""} translate="no">{guestUrl}</p>
      {live
        ? <>
          <div className="mt-3 flex flex-wrap gap-3">
            <CopyLinkButton value={guestUrl} label="Copy link" className="button button-secondary" failure="We couldn’t copy the link. Select it above and copy it manually."><Icon name="link" /></CopyLinkButton>
            <a href={`${guestUrl}/rsvp`} target="_blank" rel="noopener noreferrer" className="button button-secondary"><Icon name="external" />Open RSVP page<span className="sr-only"> (opens in a new tab)</span></a>
          </div>
          <p className="field-help">For a ready-made message and WhatsApp sharing, open <Link href="/dashboard/publish" className="text-link">Publish</Link>.</p>
        </>
        : <p className="field-help"><span className="badge"><Icon name="lock" />{status.availability === "offline" ? "Currently offline" : "Works once published"}</span></p>}
      <form action={rotateAction} className="mt-5 border-t border-[var(--line)] pt-5"><p className="text-sm leading-relaxed">Replacing gives all your guest pages a new private address. Every link you shared before stops working, including your Save the Date.</p><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_rotate" value="yes" required /><span>Replace my guest link and stop every previously shared link from working</span></label><button className="button button-secondary mt-3" disabled={rotatePending}>{rotatePending ? "Replacing…" : "Replace guest link"}</button>{rotated.message && <p className={rotated.success ? "form-notice" : "form-error"} role={rotated.success ? "status" : "alert"}>{rotated.message}</p>}</form>
    </section>
    <section className="ws-panel" aria-labelledby="rsvp-settings-title">
      <div className="ws-panel-head">
        <h2 id="rsvp-settings-title">RSVP settings</h2>
        <span className={status.availability === "open" ? "badge badge-positive" : "badge"}>{status.label}</span>
      </div>
      <p className="ws-panel-intro">{status.note}</p>
      <form action={settingsAction} noValidate className="mt-5">
        <label className="details-toggle"><input name="rsvp_enabled" type="checkbox" defaultChecked={enabled} /><span><strong>Accept RSVPs</strong><span className="mt-1 block text-sm text-[var(--muted)]">Anyone with your guest link can respond. Closing RSVP keeps saved responses.</span></span></label>
        <div className="mt-5 max-w-sm"><label htmlFor="rsvp_closes_on" className="field-label">Closing date <span className="font-normal text-[var(--muted)]">(optional)</span></label><input id="rsvp_closes_on" name="rsvp_closes_on" type="date" defaultValue={closesOn ?? ""} min="1900-01-01" max="2199-12-31" className="field-input" aria-invalid={!!settings.errors?.rsvp_closes_on} aria-describedby="rsvp-close-help" /><p id="rsvp-close-help" className={settings.errors?.rsvp_closes_on ? "field-error" : "field-help"}>{settings.errors?.rsvp_closes_on?.[0] ?? "Guests can reply until 23:59 UTC on this date: 23:59 in the UK and Ireland in winter, 00:59 the next morning in summer. Leave empty for no closing date."}</p></div>
        {settings.message && <p className={`mt-5 ${settings.success ? "form-notice" : "form-error"}`} role={settings.success ? "status" : "alert"}>{settings.success ? `${settings.message} ${status.note}` : settings.message}</p>}
        <button className="button button-primary mt-5" disabled={settingsPending}>{settingsPending ? "Saving…" : "Save RSVP settings"}</button>
      </form>
    </section>
    <div><Link href="/dashboard/preview/rsvp" prefetch={false} className="button button-secondary"><Icon name="eye" />Preview RSVP page</Link><p className="field-help">Preview your saved names and wedding style. {status.availability === "offline" ? "The guest link above is offline until you purchase a new site period." : "Your guest link above opens the live pages once published."}</p></div>
  </div>;
}
