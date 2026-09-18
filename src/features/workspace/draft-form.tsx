"use client";

import { useActionState, useState } from "react";
import { saveDraft } from "./actions";
import type { Draft } from "./validation";
import type { FormState } from "@/features/account/validation";

const fields = [
  { name: "first_name", label: "Your name", max: 80, autoComplete: "given-name" },
  { name: "second_name", label: "Your partner’s name", max: 80, autoComplete: "off" },
  { name: "wedding_date", label: "Wedding date", type: "date", autoComplete: "off" },
  { name: "location", label: "Wedding location", max: 160, autoComplete: "off" },
] as const;

export function DraftForm({ initial, published = false }: { initial: Draft; published?: boolean }) {
  const [values, setValues] = useState(initial);
  const [state, action, pending] = useActionState<FormState, FormData>(saveDraft, {});
  const [dirty, setDirty] = useState(false);
  function change(name: keyof Draft, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setDirty(true);
  }
  return <form action={(form) => { setDirty(false); action(form); }} className="mt-9" noValidate>
    <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
      {fields.map((field) => <div key={field.name}>
        <label htmlFor={field.name} className="field-label">{field.label} <span className="font-normal text-[var(--muted)]">(required)</span></label>
        <input className="field-input" id={field.name} name={field.name} type={"type" in field ? field.type : "text"} maxLength={"max" in field ? field.max : undefined} min={field.name === "wedding_date" ? "1900-01-01" : undefined} max={field.name === "wedding_date" ? "2199-12-31" : undefined} autoComplete={field.autoComplete} required value={values[field.name]} onChange={(event) => change(field.name, event.target.value)} aria-invalid={!!state.errors?.[field.name]} aria-describedby={state.errors?.[field.name] ? `${field.name}-error` : undefined} />
        {state.errors?.[field.name] && <p id={`${field.name}-error`} className="field-error">{state.errors[field.name]?.[0]}</p>}
      </div>)}
    </div>
    <div className="mt-6">
      <label htmlFor="message" className="field-label">A note to your guests <span className="font-normal text-[var(--muted)]">(optional)</span></label>
      <textarea id="message" name="message" className="field-input min-h-32 resize-y" maxLength={500} value={values.message} onChange={(event) => change("message", event.target.value)} aria-invalid={!!state.errors?.message} aria-describedby="message-help" />
      <p id="message-help" className={state.errors?.message ? "field-error" : "field-help"}>{state.errors?.message?.[0] ?? `${values.message.length} / 500 characters. A short welcome for your guests.`}</p>
    </div>
    {state.message && !(state.success && dirty) && <p className={`mt-6 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
      <button className="primary-button sm:min-w-44" disabled={pending}>{pending ? "Saving…" : published ? "Save live changes" : "Save private draft"}</button>
      {dirty && <p className="text-sm text-[var(--muted)]">You have unsaved changes.</p>}
    </div>
  </form>;
}
