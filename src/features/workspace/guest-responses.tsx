"use client";

import { useActionState } from "react";
import type { OwnerInvitation, RsvpState, SharedResponse } from "@/features/weddings/rsvp";
import { manageSharedResponse, revokeInvitation } from "./rsvp-actions";

function RevokeButton({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(revokeInvitation, {});
  return <div><form action={action}><input type="hidden" name="invitation_id" value={invitationId} /><button className="text-link min-h-11 text-sm" disabled={pending}>{pending ? "Revoking…" : "Revoke link"}</button></form>{state.message && <p className={state.success ? "form-notice" : "field-error"} role={state.success ? "status" : "alert"}>{state.message}</p>}</div>;
}

function SharedResponseRow({ response }: { response: SharedResponse }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(manageSharedResponse, {});
  return <li className="rsvp-invitation">
    <div className="min-w-0 w-full">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <strong className="break-words">{response.responding_name}</strong>
        <span className={`rsvp-status ${response.attending ? "is-attending" : "is-declined"}`}>{response.attending ? "Attending" : "Not attending"}</span>
        <span className="text-sm text-[var(--muted)]">{new Date(response.responded_at).toLocaleDateString("en-GB")}</span>
      </div>
      <details className="mt-1"><summary className="text-link inline-flex min-h-11 cursor-pointer items-center text-sm">Correct or remove response</summary>
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

export function GuestResponses({ invitations, sharedResponses }: { invitations: OwnerInvitation[]; sharedResponses: SharedResponse[] }) {
  return <>
    <section className="ws-panel" aria-labelledby="responses-title">
      <h2 id="responses-title">Guest responses</h2>
      <p className="ws-panel-intro">Each submission appears separately, even if two guests enter the same name. Contact guests to resolve duplicates or changes.</p>
      {sharedResponses.length === 0 ? <p className="ws-empty">No shared-link responses yet.</p> : <ul className="mt-5 grid gap-3">{sharedResponses.map((response) => <SharedResponseRow key={response.id} response={response} />)}</ul>}
    </section>
    {invitations.length > 0 && <section className="ws-panel" aria-labelledby="legacy-rsvp-title">
      <h2 id="legacy-rsvp-title">Earlier individual invitations</h2>
      <p className="ws-panel-intro">Previously sent links still work. You can revoke them here; their saved responses remain visible.</p>
      <ul className="mt-5 grid gap-3">{invitations.map((invitation) => <li key={invitation.id} className="rsvp-invitation"><div className="min-w-0"><strong className="break-words">{invitation.invite_name}</strong><p className="mt-2 text-sm">{invitation.revoked_at ? "Revoked · " : ""}{invitation.responding_name ? `${invitation.responding_name} · ${invitation.attending ? "Attending" : "Not attending"}` : "Awaiting response"}</p></div>{!invitation.revoked_at && <RevokeButton invitationId={invitation.id} />}</li>)}</ul>
    </section>}
  </>;
}
