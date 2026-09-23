"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sharedRsvpHref } from "@/features/weddings/invitation-context";
import type { RsvpState } from "@/features/weddings/rsvp";
import { rotateSharedRsvp, saveRsvpSettings } from "./rsvp-actions";
import { CopyLinkButton } from "./copy-link-button";

export function RsvpManager({ enabled, closesOn, slug, shareSecret }: { enabled: boolean; closesOn: string | null; slug: string | null; shareSecret: string }) {
  const [settings, settingsAction, settingsPending] = useActionState<RsvpState, FormData>(saveRsvpSettings, {});
  const [rotated, rotateAction, rotatePending] = useActionState<RsvpState, FormData>(rotateSharedRsvp, {});
  const shareUrl = rotated.inviteUrl ?? (slug ? sharedRsvpHref(slug, shareSecret) : null);

  return <div className="ws-stack">
    <section className="ws-panel" aria-labelledby="shared-rsvp-title">
      <h2 id="shared-rsvp-title">One link for all guests</h2>
      <p className="ws-panel-intro">Share this same private link with everyone. Guests enter their own names; only you can see responses. They should contact you if plans change.</p>
      {shareUrl ? <div className="mt-5">
        <label htmlFor="shared-rsvp-url" className="field-label">Your shared RSVP link</label>
        <input id="shared-rsvp-url" className="field-input font-mono text-xs" value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
        <div className="mt-3 flex flex-wrap gap-x-5">
          <CopyLinkButton href={shareUrl} label="Copy full link" className="text-link min-h-11" failure="We couldn’t copy the link. Select it above and copy it manually." />
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-link inline-flex min-h-11 items-center">Open RSVP page<span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </div> : <p className="field-help mt-4">Publish your site and choose its permanent URL to get the shared link.</p>}
      {shareUrl && <form action={rotateAction} className="mt-5 border-t border-[var(--line)] pt-5"><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_rotate" value="yes" required /><span>Replace this link and stop previously shared copies from working</span></label><button className="text-link mt-2 min-h-11" disabled={rotatePending}>{rotatePending ? "Replacing…" : "Replace shared link"}</button>{rotated.message && <p className={rotated.success ? "form-notice" : "form-error"} role={rotated.success ? "status" : "alert"}>{rotated.message}</p>}</form>}
    </section>
    <section className="ws-panel" aria-labelledby="rsvp-settings-title">
      <h2 id="rsvp-settings-title">RSVP settings</h2>
      <form action={settingsAction} noValidate className="mt-5">
        <label className="details-toggle"><input name="rsvp_enabled" type="checkbox" defaultChecked={enabled} /><span><strong>Accept RSVPs</strong><span className="mt-1 block text-sm text-[var(--muted)]">Anyone with your shared private link can respond. Closing RSVP keeps saved responses.</span></span></label>
        <div className="mt-5 max-w-sm"><label htmlFor="rsvp_closes_on" className="field-label">Closing date <span className="font-normal text-[var(--muted)]">(optional)</span></label><input id="rsvp_closes_on" name="rsvp_closes_on" type="date" defaultValue={closesOn ?? ""} min="1900-01-01" max="2199-12-31" className="field-input" aria-invalid={!!settings.errors?.rsvp_closes_on} aria-describedby="rsvp-close-help" /><p id="rsvp-close-help" className={settings.errors?.rsvp_closes_on ? "field-error" : "field-help"}>{settings.errors?.rsvp_closes_on?.[0] ?? "Responses stay open through 23:59 UTC on this date."}</p></div>
        {settings.message && <p className={`mt-5 ${settings.success ? "form-notice" : "form-error"}`} role={settings.success ? "status" : "alert"}>{settings.message}</p>}
        <button className="primary-button mt-5" disabled={settingsPending}>{settingsPending ? "Saving…" : "Save RSVP settings"}</button>
      </form>
    </section>
    <div><Link href="/dashboard/preview/rsvp" prefetch={false} className="text-link inline-flex min-h-11 items-center">Preview RSVP page</Link><p className="field-help">Preview your saved names and wedding style. Your shared link above opens the live guest page.</p></div>
  </div>;
}
