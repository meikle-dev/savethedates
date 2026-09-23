"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sharedRsvpHref } from "@/features/weddings/invitation-context";
import type { OwnerInvitation, RsvpState, SharedResponse } from "@/features/weddings/rsvp";
import { manageSharedResponse, revokeInvitation, rotateSharedRsvp, saveRsvpSettings } from "./rsvp-actions";

function RevokeButton({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(revokeInvitation, {});
  return <div><form action={action}><input type="hidden" name="invitation_id" value={invitationId} /><button className="text-link min-h-11 text-sm" disabled={pending}>{pending ? "Revoking…" : "Revoke link"}</button></form>{state.message && <p className={state.success ? "form-notice" : "field-error"} role={state.success ? "status" : "alert"}>{state.message}</p>}</div>;
}

function SharedResponseRow({ response }: { response: SharedResponse }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(manageSharedResponse, {});
  return <li className="rsvp-invitation">
    <div className="min-w-0 w-full">
      <strong className="break-words">{response.responding_name}</strong>
      <p className="mt-2 text-sm">{response.attending ? "Attending" : "Not attending"} · {new Date(response.responded_at).toLocaleDateString("en-GB")}</p>
      <details className="mt-3"><summary className="text-link inline-flex min-h-11 cursor-pointer items-center">Correct or remove response</summary>
        <form action={action} noValidate className="mt-3 grid gap-3">
          <input type="hidden" name="response_id" value={response.id} />
          <div><label htmlFor={`name-${response.id}`} className="field-label">Responding name</label><input id={`name-${response.id}`} name="responding_name" className="field-input" defaultValue={response.responding_name} maxLength={80} aria-invalid={!!state.errors?.responding_name} aria-describedby={state.errors?.responding_name ? `name-error-${response.id}` : undefined} />{state.errors?.responding_name && <p id={`name-error-${response.id}`} className="field-error">{state.errors.responding_name[0]}</p>}</div>
          <fieldset aria-invalid={!!state.errors?.attending} aria-describedby={state.errors?.attending ? `attendance-error-${response.id}` : undefined}><legend className="field-label">Attendance</legend><div className="flex flex-wrap gap-4 text-sm"><label><input type="radio" name="attending" value="yes" defaultChecked={response.attending} /> Attending</label><label><input type="radio" name="attending" value="no" defaultChecked={!response.attending} /> Not attending</label></div>{state.errors?.attending && <p id={`attendance-error-${response.id}`} className="field-error">{state.errors.attending[0]}</p>}</fieldset>
          <button name="intent" value="correct" className="text-link min-h-11 justify-self-start" disabled={pending}>Save correction</button>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_remove" value="yes" /><span>Remove this response from the list and totals</span></label>
          <button name="intent" value="remove" className="text-link min-h-11 justify-self-start" disabled={pending}>Remove response</button>
          {state.message && <p className={state.success ? "form-notice" : "form-error"} role={state.success ? "status" : "alert"}>{state.message}</p>}
        </form>
      </details>
    </div>
  </li>;
}

export function RsvpManager({ enabled, closesOn, slug, shareSecret, invitations, sharedResponses }: { enabled: boolean; closesOn: string | null; slug: string | null; shareSecret: string; invitations: OwnerInvitation[]; sharedResponses: SharedResponse[] }) {
  const [settings, settingsAction, settingsPending] = useActionState<RsvpState, FormData>(saveRsvpSettings, {});
  const [rotated, rotateAction, rotatePending] = useActionState<RsvpState, FormData>(rotateSharedRsvp, {});
  const [copyFailed, setCopyFailed] = useState(false);
  const shareUrl = rotated.inviteUrl ?? (slug ? sharedRsvpHref(slug, shareSecret) : null);
  const legacyResponses = invitations.filter((invite) => invite.attending !== null);
  const responses = [...sharedResponses, ...legacyResponses];
  const attending = responses.filter((response) => response.attending).length;

  async function copyLink() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(new URL(shareUrl, window.location.origin).href); setCopyFailed(false); }
    catch { setCopyFailed(true); }
  }

  return <div className="mt-7 grid gap-8">
    <div><Link href="/dashboard/preview/rsvp" prefetch={false} className="text-link inline-flex min-h-11 items-center">Preview RSVP page</Link><p className="field-help">Preview your saved names and wedding style. Your shared link below opens the live guest page.</p></div>
    <form action={settingsAction} noValidate>
      <label className="details-toggle"><input name="rsvp_enabled" type="checkbox" defaultChecked={enabled} /><span><strong>Accept RSVPs</strong><span className="mt-1 block text-sm text-[var(--muted)]">Anyone with your shared private link can respond. Closing RSVP keeps saved responses.</span></span></label>
      <div className="mt-5 max-w-sm"><label htmlFor="rsvp_closes_on" className="field-label">Closing date <span className="font-normal text-[var(--muted)]">(optional)</span></label><input id="rsvp_closes_on" name="rsvp_closes_on" type="date" defaultValue={closesOn ?? ""} min="1900-01-01" max="2199-12-31" className="field-input" aria-invalid={!!settings.errors?.rsvp_closes_on} aria-describedby="rsvp-close-help" /><p id="rsvp-close-help" className={settings.errors?.rsvp_closes_on ? "field-error" : "field-help"}>{settings.errors?.rsvp_closes_on?.[0] ?? "Responses stay open through 23:59 UTC on this date."}</p></div>
      {settings.message && <p className={settings.success ? "form-notice" : "form-error"} role={settings.success ? "status" : "alert"}>{settings.message}</p>}
      <button className="primary-button mt-5" disabled={settingsPending}>{settingsPending ? "Saving…" : "Save RSVP settings"}</button>
    </form>
    <div className="rsvp-summary" aria-label="RSVP summary"><div><strong>{responses.length}</strong><span>Responses</span></div><div><strong>{attending}</strong><span>Attending</span></div><div><strong>{responses.length - attending}</strong><span>Not attending</span></div></div>
    <section className="border-t border-[var(--line)] pt-6" aria-labelledby="shared-rsvp-title">
      <h3 id="shared-rsvp-title" className="font-semibold">One link for all guests</h3>
      <p className="field-help">Share this same private link with everyone. Guests enter their own names; only you can see responses. They should contact you if plans change.</p>
      {shareUrl ? <div className="mt-4 rounded-md border border-[var(--line)] bg-white/60 p-4">
        <label htmlFor="shared-rsvp-url" className="field-label">Your shared RSVP link</label>
        <input id="shared-rsvp-url" className="field-input font-mono text-xs" value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
        <button type="button" className="text-link mt-3 min-h-11" onClick={copyLink}>Copy full link</button>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-link mt-3 ml-5 inline-flex min-h-11 items-center">Open RSVP page<span className="sr-only"> (opens in a new tab)</span></a>
        {copyFailed && <p className="field-error mt-2" role="alert">We couldn’t copy the link. Select it above and copy it manually.</p>}
      </div> : <p className="field-help mt-4">Publish your site and choose its permanent URL to get the shared link.</p>}
      {shareUrl && <form action={rotateAction} className="mt-5"><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_rotate" value="yes" required /><span>Replace this link and stop previously shared copies from working</span></label><button className="text-link mt-2 min-h-11" disabled={rotatePending}>{rotatePending ? "Replacing…" : "Replace shared link"}</button>{rotated.message && <p className={rotated.success ? "form-notice" : "form-error"} role={rotated.success ? "status" : "alert"}>{rotated.message}</p>}</form>}
    </section>
    <section className="border-t border-[var(--line)] pt-6" aria-labelledby="responses-title"><h3 id="responses-title" className="font-semibold">Guest responses</h3><p className="field-help">Each submission appears separately, even if two guests enter the same name. Contact guests to resolve duplicates or changes.</p>
      {sharedResponses.length === 0 ? <p className="mt-3 text-sm text-[var(--muted)]">No shared-link responses yet.</p> : <ul className="mt-4 grid gap-3">{sharedResponses.map((response) => <SharedResponseRow key={response.id} response={response} />)}</ul>}
    </section>
    {invitations.length > 0 && <section className="border-t border-[var(--line)] pt-6" aria-labelledby="legacy-rsvp-title"><h3 id="legacy-rsvp-title" className="font-semibold">Earlier individual invitations</h3><p className="field-help">Previously sent links still work. You can revoke them here; their saved responses remain visible.</p><ul className="mt-4 grid gap-3">{invitations.map((invitation) => <li key={invitation.id} className="rsvp-invitation"><div className="min-w-0"><strong className="break-words">{invitation.invite_name}</strong><p className="mt-2 text-sm">{invitation.revoked_at ? "Revoked · " : ""}{invitation.responding_name ? `${invitation.responding_name} · ${invitation.attending ? "Attending" : "Not attending"}` : "Awaiting response"}</p></div>{!invitation.revoked_at && <RevokeButton invitationId={invitation.id} />}</li>)}</ul></section>}
  </div>;
}
