"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { standardInvitationWording, type InvitationFormState, type InvitationSettings } from "@/features/weddings/invitation";
import { saveInvitation } from "./invitation-actions";
import { Icon } from "./workspace-icons";

type TextFieldName = Exclude<keyof InvitationSettings, "invitation_enabled">;

function Field({ name, label, value, max, error, help, multiline = false, placeholder, onChange }: {
  name: TextFieldName; label: string; value: string; max: number; error?: string[]; help?: string; multiline?: boolean; placeholder?: string; onChange: (name: TextFieldName, value: string) => void;
}) {
  const describedBy = [`${name}-help`, error && `${name}-error`].filter(Boolean).join(" ");
  const common = { id: name, name, className: `field-input${multiline ? " min-h-24 resize-y" : ""}`, value, maxLength: max, placeholder, "aria-invalid": !!error, "aria-describedby": describedBy };
  return <div>
    <label htmlFor={name} className="field-label">{label}<span className="font-normal text-[var(--muted)]"> (optional)</span></label>
    {multiline
      ? <textarea {...common} onChange={(event) => onChange(name, event.target.value)} />
      : <input {...common} type="text" onChange={(event) => onChange(name, event.target.value)} />}
    <p id={`${name}-help`} className="field-help">{help ? `${help} ` : ""}{value.length} / {max.toLocaleString("en-GB")} characters.</p>
    {error && <p id={`${name}-error`} className="field-error">{error[0]}</p>}
  </div>;
}

export function InvitationForm({ initial, published }: { initial: InvitationSettings; published: boolean }) {
  const [state, action, pending] = useActionState<InvitationFormState, FormData>(saveInvitation, {});
  const [values, setValues] = useState(state.values ?? initial);
  const [dirty, setDirty] = useState(false);
  const [appliedState, setAppliedState] = useState(state);
  const savedVisible = state.success && state.values ? state.values.invitation_enabled : initial.invitation_enabled;
  const savedVisibility = savedVisible
    ? published ? "Saved Invitation is visible on your live site." : "Saved Invitation will appear when you publish."
    : "Saved Invitation is hidden from guests.";
  if (appliedState !== state) {
    setAppliedState(state);
    if (state.values) setValues(state.values);
    setDirty(!!state.values && !state.success);
  }
  function change(name: TextFieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setDirty(true);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => action(form));
  }
  return <form onSubmit={submit} className="details-form mt-7" noValidate>
    <fieldset className="details-editor-group">
      <legend>Wording</legend>
      <p className="field-help mt-2 mb-5">Your names and wedding date are added for you. Leave a line empty to leave it out.</p>
      <div className="grid gap-6">
        <Field name="invitation_host_line" label="Opening line" value={values.invitation_host_line} max={160} error={state.errors?.invitation_host_line} help="For example, “Together with their families”." onChange={change} />
        <Field name="invitation_wording" label="Invitation wording" value={values.invitation_wording} max={300} error={state.errors?.invitation_wording} multiline placeholder={standardInvitationWording} help="Shown after your names. Left empty, it reads “request the pleasure of your company at their wedding”." onChange={change} />
        <Field name="invitation_afterwards" label="Afterwards" value={values.invitation_afterwards} max={160} error={state.errors?.invitation_afterwards} help="For example, “followed by dinner and dancing”." onChange={change} />
      </div>
    </fieldset>

    <fieldset className="details-editor-group">
      <legend>When and where</legend>
      <p className="field-help mt-2 mb-5">Also shown on your Details page. Without an address, your invitation shows the location from Basics.</p>
      <div className="grid gap-5 md:grid-cols-2">
        <Field name="ceremony_time" label="Ceremony time" value={values.ceremony_time} max={160} error={state.errors?.ceremony_time} help="For example, 2:30 pm." onChange={change} />
        <Field name="ceremony_venue" label="Venue" value={values.ceremony_venue} max={160} error={state.errors?.ceremony_venue} onChange={change} />
        <Field name="ceremony_address" label="Address" value={values.ceremony_address} max={160} error={state.errors?.ceremony_address} help="Include the town and postcode when available." onChange={change} />
      </div>
    </fieldset>

    {state.message && !(state.success && dirty) && <p className={`mt-6 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
    <div className="details-save-area mt-7">
      <label className="details-toggle">
        <input name="invitation_enabled" type="checkbox" checked={values.invitation_enabled} aria-describedby="invitation-enabled-help" onChange={(event) => { setValues((current) => ({ ...current, invitation_enabled: event.target.checked })); setDirty(true); }} />
        <span><strong>Show Invitation page</strong><span id="invitation-enabled-help" className="mt-1 block text-sm text-[var(--muted)]">Guests can open it only when your wedding site is published. Sending printed invitations? Leave this off.</span></span>
      </label>
      <p className="details-saved-status mt-2 text-sm" role="status">{savedVisibility}</p>
      {values.invitation_enabled !== savedVisible && <p className="field-help">Save to apply this visibility change.</p>}
      <div className="details-save-action mt-3">
        <button className="button button-primary sm:min-w-44" disabled={pending}>{pending ? "Saving…" : published ? "Save live Invitation" : "Save Invitation"}</button>
        {dirty && <p className="text-sm text-[var(--muted)]">You have unsaved Invitation changes.</p>}
      </div>
    </div>
    <Link href="/dashboard/preview/invitation" prefetch={false} className="button button-secondary mt-5"><Icon name="eye" />Preview saved Invitation</Link>
  </form>;
}
