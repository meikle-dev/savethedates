"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { OwnerInvitation, RsvpState } from "@/features/weddings/rsvp";
import { createInvitation, revokeInvitation, saveRsvpSettings } from "./rsvp-actions";

function ResponseState({ invitation }: { invitation: OwnerInvitation }) {
  return <>{invitation.revoked_at && <span className="rsvp-status">Revoked</span>}<span className={`rsvp-status ${invitation.attending === true ? "is-attending" : invitation.attending === false ? "is-declined" : ""}`}>{invitation.attending === null ? "Awaiting response" : invitation.attending ? "Attending" : "Not attending"}</span></>;
}

function RevokeButton({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState<RsvpState, FormData>(revokeInvitation, {});
  return <div><form action={action}><input type="hidden" name="invitation_id" value={invitationId} /><button className="text-link min-h-11 text-sm" disabled={pending}>{pending ? "Revoking…" : "Revoke link"}</button></form>{state.message && <p className={`mt-1 text-xs ${state.success ? "text-[var(--muted)]" : "field-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}</div>;
}

export function RsvpManager({ enabled, closesOn, slug, invitations }: { enabled: boolean; closesOn: string | null; slug: string | null; invitations: OwnerInvitation[] }) {
  const [settings, settingsAction, settingsPending] = useActionState<RsvpState, FormData>(saveRsvpSettings, {});
  const [created, createAction, createPending] = useActionState<RsvpState, FormData>(createInvitation, {});
  const [copyResult, setCopyResult] = useState<{ url: string; failed: boolean } | null>(null);
  const active = invitations.filter((invite) => !invite.revoked_at);
  const responses = active.filter((invite) => invite.attending !== null);
  const attending = responses.filter((invite) => invite.attending).length;

  async function copyLink() {
    if (!created.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(new URL(created.inviteUrl, window.location.origin).href);
      setCopyResult({ url: created.inviteUrl, failed: false });
    } catch {
      setCopyResult({ url: created.inviteUrl, failed: true });
    }
  }

  return <div className="mt-7 grid gap-8">
    <div><Link href="/dashboard/preview/rsvp" prefetch={false} className="text-link inline-flex min-h-11 items-center">Preview RSVP page</Link><p className="field-help">Preview your saved names and wedding style. After creating an invitation below, use Open invitation to view the exact private link your guest will receive.</p></div>
    <form action={settingsAction} noValidate>
      <label className="details-toggle">
        <input name="rsvp_enabled" type="checkbox" defaultChecked={enabled} />
        <span><strong>Accept RSVPs</strong><span className="mt-1 block text-sm text-[var(--muted)]">Only guests with a private invitation link can respond. Closing RSVP keeps saved responses.</span></span>
      </label>
      <div className="mt-5 max-w-sm">
        <label htmlFor="rsvp_closes_on" className="field-label">Closing date <span className="font-normal text-[var(--muted)]">(optional)</span></label>
        <input id="rsvp_closes_on" name="rsvp_closes_on" type="date" defaultValue={closesOn ?? ""} min="1900-01-01" max="2199-12-31" className="field-input" aria-invalid={!!settings.errors?.rsvp_closes_on} aria-describedby="rsvp-close-help" />
        <p id="rsvp-close-help" className={settings.errors?.rsvp_closes_on ? "field-error" : "field-help"}>{settings.errors?.rsvp_closes_on?.[0] ?? "Responses stay open through 23:59 UTC on this date."}</p>
      </div>
      {settings.message && <p className={`mt-5 ${settings.success ? "form-notice" : "form-error"}`} role={settings.success ? "status" : "alert"}>{settings.message}</p>}
      <button className="primary-button mt-5" disabled={settingsPending}>{settingsPending ? "Saving…" : "Save RSVP settings"}</button>
    </form>

    <div className="rsvp-summary" aria-label="RSVP summary">
      <div><strong>{active.length}</strong><span>Active invitations</span></div>
      <div><strong>{responses.length}</strong><span>Responses</span></div>
      <div><strong>{attending}</strong><span>Attending</span></div>
    </div>

    <form action={createAction} noValidate className="border-t border-[var(--line)] pt-6">
      <h3 className="font-semibold">Create a private invitation link</h3>
      <p className="field-help">One link collects one response. Anyone given the link can use it, so share it privately.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grow">
          <label htmlFor="invite_name" className="field-label">Guest or household name</label>
          <input id="invite_name" name="invite_name" className="field-input" maxLength={80} placeholder="e.g. Sam Taylor" aria-invalid={!!created.errors?.invite_name} aria-describedby={created.errors?.invite_name ? "invite-name-error" : undefined} />
          {created.errors?.invite_name && <p id="invite-name-error" className="field-error">{created.errors.invite_name[0]}</p>}
        </div>
        <button className="primary-button shrink-0" disabled={createPending || !slug}>{createPending ? "Creating…" : "Create link"}</button>
      </div>
      {!slug && <p className="form-error mt-4">Publish your site and choose its permanent URL before creating invitation links.</p>}
      {created.message && <p className={`mt-4 ${created.success ? "form-notice" : "form-error"}`} role={created.success ? "status" : "alert"}>{created.message}</p>}
      {created.inviteUrl && <div className="mt-4 rounded-md border border-[var(--line)] bg-white/60 p-4">
        <dl className="mb-3 grid gap-1 text-sm">
          <div><dt className="inline font-semibold">For: </dt><dd className="inline break-words">{created.inviteName}</dd></div>
          <div><dt className="inline font-semibold">Wedding URL: </dt><dd className="inline break-all font-mono text-xs">{created.weddingUrl}</dd></div>
        </dl>
        <label htmlFor="new-invite-url" className="field-label">New private link</label>
        <input id="new-invite-url" className="field-input font-mono text-xs" value={created.inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
        <button type="button" className="text-link mt-3 min-h-11" onClick={copyLink}>{copyResult?.url === created.inviteUrl && !copyResult.failed ? "Copied" : "Copy full link"}</button>
        <a href={created.inviteUrl} target="_blank" rel="noopener noreferrer" className="text-link mt-3 ml-5 inline-flex min-h-11 items-center">Open invitation<span className="sr-only"> (opens in a new tab)</span></a>
        {copyResult?.url === created.inviteUrl && copyResult.failed && <p className="field-error mt-2" role="alert">We couldn’t copy the link. Select the link above and copy it manually.</p>}
      </div>}
    </form>

    <div className="border-t border-[var(--line)] pt-6">
      <h3 className="font-semibold">Invitations and responses</h3>
      {invitations.length === 0 ? <p className="mt-3 text-sm text-[var(--muted)]">No invitations yet.</p> : <ul className="mt-4 grid gap-3">
        {invitations.map((invitation) => <li key={invitation.id} className="rsvp-invitation">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><strong className="break-words">{invitation.invite_name}</strong><ResponseState invitation={invitation} /></div>
            {invitation.responding_name && <p className="mt-2 text-sm">Response from {invitation.responding_name}{invitation.responded_at ? ` · ${new Date(invitation.responded_at).toLocaleDateString("en-GB")}` : ""}</p>}
          </div>
          {!invitation.revoked_at && <RevokeButton invitationId={invitation.id} />}
        </li>)}
      </ul>}
    </div>
  </div>;
}
