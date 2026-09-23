"use client";

import { useActionState, useState } from "react";
import type { OwnerInvitation, RsvpState, SharedResponse } from "@/features/weddings/rsvp";
import { AttendanceBadge } from "./attendance-badge";
import { manageSharedResponse, revokeInvitation } from "./rsvp-actions";

function RevokeButton({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(revokeInvitation, {});
  return <div><form action={action}><input type="hidden" name="invitation_id" value={invitationId} /><button className="button button-secondary" disabled={pending}>{pending ? "Revoking…" : "Revoke link"}</button></form>{state.message && <p className={state.success ? "form-notice" : "field-error"} role={state.success ? "status" : "alert"}>{state.message}</p>}</div>;
}

// One table row plus an inline correction panel directly beneath it.
function GuestRow({ response, date, onSuccess }: { response: SharedResponse; date: string; onSuccess: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  // The row may leave this page (removed, or no longer matching the filter), so report success outside it too.
  const [state, action, pending] = useActionState<RsvpState, FormData>(async (previous, form) => {
    const result = await manageSharedResponse(previous, form);
    if (result.success && result.message) onSuccess(result.message);
    return result;
  }, {});
  const panelId = `correct-${response.id}`;
  return <>
    <tr className="guest-row">
      <th scope="row" className="guest-name">{response.responding_name}</th>
      <td><AttendanceBadge attending={response.attending} /></td>
      <td className="guest-date"><time dateTime={response.responded_at}>{date}</time></td>
      <td className="guest-action">
        <button type="button" className="button button-quiet button-flush" aria-expanded={open} aria-controls={panelId} aria-label={`Correct or remove response from ${response.responding_name}`} onClick={() => setOpen(!open)}>
          Correct or remove
        </button>
      </td>
    </tr>
    <tr id={panelId} className="guest-panel" hidden={!open}>
      <td colSpan={4}>
        <form action={action} noValidate className="grid gap-3">
          <input type="hidden" name="response_id" value={response.id} />
          <div><label htmlFor={`name-${response.id}`} className="field-label">Responding name</label><input id={`name-${response.id}`} name="responding_name" className="field-input" defaultValue={response.responding_name} maxLength={80} aria-invalid={!!state.errors?.responding_name} aria-describedby={state.errors?.responding_name ? `name-error-${response.id}` : undefined} />{state.errors?.responding_name && <p id={`name-error-${response.id}`} className="field-error">{state.errors.responding_name[0]}</p>}</div>
          <fieldset aria-invalid={!!state.errors?.attending} aria-describedby={state.errors?.attending ? `attendance-error-${response.id}` : undefined}><legend className="field-label">Attendance</legend><div className="segmented"><label className="segment"><input type="radio" name="attending" value="yes" defaultChecked={response.attending} />Attending</label><label className="segment"><input type="radio" name="attending" value="no" defaultChecked={!response.attending} />Not attending</label></div>{state.errors?.attending && <p id={`attendance-error-${response.id}`} className="field-error">{state.errors.attending[0]}</p>}</fieldset>
          <button name="intent" value="correct" className="button button-primary justify-self-start" disabled={pending}>Save correction</button>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_remove" value="yes" /><span>Remove this response from the list and totals</span></label>
          <button name="intent" value="remove" className="button button-secondary justify-self-start" disabled={pending}>Remove response</button>
          {state.message && <p className={state.success ? "form-notice" : "form-error"} role={state.success ? "status" : "alert"}>{state.message}</p>}
        </form>
      </td>
    </tr>
  </>;
}

export function GuestTable({ rows, caption }: { rows: { response: SharedResponse; date: string }[]; caption: string }) {
  const [notice, setNotice] = useState("");
  return <>
    <p className="sr-only" role="status">{notice}</p>
    <table className="guest-table">
      <caption className="sr-only">{caption}</caption>
      <thead><tr><th scope="col">Name</th><th scope="col">Response</th><th scope="col">Date</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{rows.map(({ response, date }) => <GuestRow key={response.id} response={response} date={date} onSuccess={setNotice} />)}</tbody>
    </table>
  </>;
}

export function LegacyInvitations({ invitations }: { invitations: OwnerInvitation[] }) {
  if (invitations.length === 0) return null;
  return <section className="ws-panel" aria-labelledby="legacy-rsvp-title">
    <h2 id="legacy-rsvp-title">Earlier individual invitations</h2>
    <p className="ws-panel-intro">Previously sent links still work. You can revoke them here; their saved responses remain visible.</p>
    <ul className="mt-5 grid gap-3">{invitations.map((invitation) => <li key={invitation.id} className="rsvp-invitation"><div className="min-w-0"><strong className="break-words">{invitation.invite_name}</strong><p className="mt-2 text-sm">{invitation.revoked_at ? "Revoked · " : ""}{invitation.responding_name ? `${invitation.responding_name} · ${invitation.attending ? "Attending" : "Not attending"}` : "Awaiting response"}</p></div>{!invitation.revoked_at && <RevokeButton invitationId={invitation.id} />}</li>)}</ul>
  </section>;
}
