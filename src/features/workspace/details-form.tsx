"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { validOptionalUrl, type DetailsFormState, type WeddingDetails } from "@/features/weddings/details";
import { saveDetails } from "./details-actions";
import { Icon } from "./workspace-icons";

type StringField = Exclude<keyof WeddingDetails, "details_enabled" | "faqs">;

function Optional({ children }: { children: React.ReactNode }) {
  return <span className="font-normal text-[var(--muted)]"> ({children})</span>;
}

function TextField({ name, label, value, error, onChange, url = false, help, checkLabel }: {
  name: StringField; label: string; value: string; error?: string[]; onChange: (name: StringField, value: string) => void; url?: boolean; help?: string; checkLabel?: string;
}) {
  const checkHref = checkLabel ? validOptionalUrl(value) : null;
  return <div>
    <label htmlFor={name} className="field-label">{label}<Optional>optional</Optional></label>
    <input id={name} name={name} type={url ? "url" : "text"} className="field-input" value={value} maxLength={url ? 2048 : 160} onChange={(event) => onChange(name, event.target.value)} aria-invalid={!!error} aria-describedby={[help && `${name}-help`, error && `${name}-error`].filter(Boolean).join(" ") || undefined} />
    {help && <p id={`${name}-help`} className="field-help">{help}</p>}
    {error && <p id={`${name}-error`} className="field-error">{error[0]}</p>}
    {checkHref && <a href={checkHref} target="_blank" rel="noopener noreferrer" className="button button-quiet button-flush mt-2">{checkLabel} (opens in a new tab)<Icon name="external" /></a>}
  </div>;
}

function Guidance({ name, label, value, error, onChange }: {
  name: "travel" | "accommodation" | "dress_code"; label: string; value: string; error?: string[]; onChange: (name: StringField, value: string) => void;
}) {
  return <div>
    <label htmlFor={name} className="field-label">{label}<Optional>optional</Optional></label>
    <textarea id={name} name={name} className="field-input min-h-28 resize-y" value={value} maxLength={1000} onChange={(event) => onChange(name, event.target.value)} aria-invalid={!!error} aria-describedby={`${name}-help`} />
    <p id={`${name}-help`} className={error ? "field-error" : "field-help"}>{error?.[0] ?? `${value.length} / 1,000 characters.`}</p>
  </div>;
}

export function DetailsForm({ initial, published }: { initial: WeddingDetails; published: boolean }) {
  const [state, action, pending] = useActionState<DetailsFormState, FormData>(saveDetails, {});
  const [values, setValues] = useState(state.values ?? initial);
  const [dirty, setDirty] = useState(false);
  const [appliedState, setAppliedState] = useState(state);
  const savedVisible = state.success && state.values ? state.values.details_enabled : initial.details_enabled;
  const savedVisibility = savedVisible
    ? published ? "Saved Details are visible on your live site." : "Saved Details will appear when you publish."
    : "Saved Details are hidden from guests.";
  if (appliedState !== state) {
    setAppliedState(state);
    if (state.values) setValues(state.values);
    setDirty(!!state.values && !state.success);
  }
  function change(name: StringField, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setDirty(true);
  }
  function updateFaq(index: number, name: "question" | "answer", value: string) {
    setValues((current) => ({ ...current, faqs: current.faqs.map((faq, position) => position === index ? { ...faq, [name]: value } : faq) }));
    setDirty(true);
  }
  function removeFaq(index: number) {
    setValues((current) => ({ ...current, faqs: current.faqs.filter((_, position) => position !== index) }));
    setDirty(true);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => action(form));
  }
  return <form onSubmit={submit} className="details-form mt-7" noValidate>
    <input type="hidden" name="faqs" value={JSON.stringify(values.faqs)} />
    <fieldset className="details-editor-group">
      <legend>Ceremony</legend>
      <p className="field-help mt-2 mb-5">You can enter any venue, including a private home or rural location. Add a shared pin link if useful, and explain how to arrive in Travel and transport below.</p>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="ceremony_time" label="Time" value={values.ceremony_time} error={state.errors?.ceremony_time} onChange={change} help="For example, 2:30 pm." />
        <TextField name="ceremony_venue" label="Venue" value={values.ceremony_venue} error={state.errors?.ceremony_venue} onChange={change} />
        <TextField name="ceremony_address" label="Address" value={values.ceremony_address} error={state.errors?.ceremony_address} onChange={change} help="Include the town and postcode when available. Check the entrance guests should use." />
        <TextField name="ceremony_url" label="Directions link" value={values.ceremony_url} error={state.values?.ceremony_url === values.ceremony_url ? state.errors?.ceremony_url : undefined} onChange={change} url help="Paste a map link or the venue’s directions. Check the destination and entrance before saving." checkLabel="Check ceremony directions" />
      </div>
    </fieldset>

    <fieldset className="details-editor-group">
      <legend>Reception</legend>
      <p className="field-help mt-2 mb-5">You can enter any venue, including a private home or rural location. Add a shared pin link if useful, and explain how to arrive in Travel and transport below.</p>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="reception_time" label="Time" value={values.reception_time} error={state.errors?.reception_time} onChange={change} help="For example, from 6 pm." />
        <TextField name="reception_venue" label="Venue" value={values.reception_venue} error={state.errors?.reception_venue} onChange={change} />
        <TextField name="reception_address" label="Address" value={values.reception_address} error={state.errors?.reception_address} onChange={change} help="Include the town and postcode when available. Check the entrance guests should use." />
        <TextField name="reception_url" label="Directions link" value={values.reception_url} error={state.values?.reception_url === values.reception_url ? state.errors?.reception_url : undefined} onChange={change} url help="Paste a map link or the venue’s directions. Check the destination and entrance before saving." checkLabel="Check reception directions" />
      </div>
    </fieldset>

    <fieldset className="details-editor-group">
      <legend>Guest information</legend>
      <div className="grid gap-6">
        <Guidance name="travel" label="Travel and transport" value={values.travel} error={state.errors?.travel} onChange={change} />
        <TextField name="travel_url" label="Travel link" value={values.travel_url} error={state.errors?.travel_url} onChange={change} url />
        <Guidance name="accommodation" label="Accommodation" value={values.accommodation} error={state.errors?.accommodation} onChange={change} />
        <TextField name="accommodation_url" label="Accommodation link" value={values.accommodation_url} error={state.errors?.accommodation_url} onChange={change} url />
        <Guidance name="dress_code" label="Dress code" value={values.dress_code} error={state.errors?.dress_code} onChange={change} />
      </div>
    </fieldset>

    <fieldset className="details-editor-group">
      <legend>Frequently asked questions</legend>
      <p className="field-help mt-0">Optional. Add up to five complete question-and-answer pairs.</p>
      <div className="mt-5 grid gap-6">
        {values.faqs.map((faq, index) => <div className="details-faq-editor" key={index}>
          <div>
            <label className="field-label" htmlFor={`faq-question-${index}`}>Question {index + 1}</label>
            <input id={`faq-question-${index}`} className="field-input" value={faq.question} maxLength={200} onChange={(event) => updateFaq(index, "question", event.target.value)} />
          </div>
          <div className="mt-4">
            <label className="field-label" htmlFor={`faq-answer-${index}`}>Answer {index + 1}</label>
            <textarea id={`faq-answer-${index}`} className="field-input min-h-28 resize-y" value={faq.answer} maxLength={1000} onChange={(event) => updateFaq(index, "answer", event.target.value)} />
          </div>
          <button type="button" className="button button-quiet button-flush mt-3" onClick={() => removeFaq(index)}>Remove question {index + 1}</button>
        </div>)}
      </div>
      {state.errors?.faqs && <p className="field-error" role="alert">Complete every FAQ question and answer, using the character limits.</p>}
      {values.faqs.length < 5 && <button type="button" className="button button-secondary mt-4" onClick={() => { setValues((current) => ({ ...current, faqs: [...current.faqs, { question: "", answer: "" }] })); setDirty(true); }}>Add a question</button>}
    </fieldset>

    {state.message && !(state.success && dirty) && <p className={`mt-6 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
    <div className="details-save-area mt-7">
      <label className="details-toggle">
        <input name="details_enabled" type="checkbox" checked={values.details_enabled} aria-invalid={!!state.errors?.details_enabled} aria-describedby={state.errors?.details_enabled ? "details-enabled-help details-enabled-error" : "details-enabled-help"} onChange={(event) => { setValues((current) => ({ ...current, details_enabled: event.target.checked })); setDirty(true); }} />
        <span><strong>Show Details page</strong><span id="details-enabled-help" className="mt-1 block text-sm text-[var(--muted)]">Guests can open it only when your wedding site is published. Turning this off keeps your saved information private.</span></span>
      </label>
      {state.errors?.details_enabled && <p id="details-enabled-error" className="field-error" role="alert">{state.errors.details_enabled[0]}</p>}
      <p className="details-saved-status mt-2 text-sm" role="status">{savedVisibility}</p>
      {values.details_enabled !== savedVisible && <p className="field-help">Save to apply this visibility change.</p>}
      <div className="details-save-action mt-3">
        <button className="button button-primary sm:min-w-44" disabled={pending}>{pending ? "Saving…" : published ? "Save live Details" : "Save Details"}</button>
        {dirty && <p className="text-sm text-[var(--muted)]">You have unsaved Details changes.</p>}
      </div>
    </div>
    <Link href="/dashboard/preview/details" prefetch={false} className="button button-secondary mt-5"><Icon name="eye" />Preview saved Details</Link>
  </form>;
}
