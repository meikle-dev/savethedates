"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { publishWedding, unpublishWedding } from "./publication-actions";
import type { FormState } from "@/features/account/validation";
import { PurchasePanel, type Entitlement } from "@/features/payments/purchase-panel";

function Notice({ state }: { state: FormState }) {
  return state.message ? <p className={`mt-4 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p> : null;
}

export function PublicationForm({ slug, published, locked, entitlement, checkout }: { slug: string | null; published: boolean; locked: boolean; entitlement: Entitlement; checkout?: string }) {
  const [url, setUrl] = useState(slug ?? "");
  const [visibility, setVisibility] = useState(false);
  const [publishState, publishAction, publishPending] = useActionState<FormState, FormData>(publishWedding, {});
  const [unpublishState, unpublishAction, unpublishPending] = useActionState<FormState, FormData>(unpublishWedding, {});

  return <>
    <p className="ws-panel-intro">Preview your saved details before sharing. Save changes in each section first.</p>
    <Link href="/dashboard/preview" prefetch={false} className="text-link mt-4 inline-flex min-h-11 items-center">Preview saved site</Link>
    <PurchasePanel entitlement={entitlement} checkout={checkout} />
    {published ? <>
      <p className="mt-6 break-all">Your wedding URL: <a className="text-link" href={`/${slug}`}>/{slug}</a></p>
      <p className="field-help mt-3">This general link shows your wedding pages. For responses, share the one private link from the <Link href="/dashboard/rsvp" className="text-link">RSVP section</Link>.</p>
      <p className="field-help mt-3">Saved details and photo changes are immediately visible to guests.</p>
      <form action={unpublishAction} className="mt-6">
        <p className="mb-4 text-sm leading-relaxed">Unpublishing hides your site and photo on new visits. It cannot remove copies someone has already downloaded.</p>
        <button className="primary-button" disabled={unpublishPending}>{unpublishPending ? "Unpublishing…" : "Unpublish site"}</button>
        {!unpublishState.success && <Notice state={unpublishState} />}
      </form>
    </> : entitlement.active ? <form action={publishAction} className="mt-6">
      <label htmlFor="slug" className="field-label">Your wedding URL</label>
      <input id="slug" name="slug" className="field-input" value={locked ? slug ?? "" : url} onChange={(event) => setUrl(event.target.value)} readOnly={locked} minLength={3} maxLength={63} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="slug-help" required />
      <p id="slug-help" className="field-help">{locked ? "Your URL is fixed from your first publication." : "3–63 letters or numbers, with single hyphens. For example: alex-and-morgan. Your URL is fixed after first publication."}</p>
      <label className="mt-6 flex items-start gap-3 text-sm leading-relaxed"><input name="visibility" type="checkbox" required checked={visibility} onChange={(event) => setVisibility(event.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--teal)]" /><span>I understand that anyone with the URL can view and copy our names, date, location, message and photo. Unpublishing cannot recall downloaded copies.</span></label>
      <button className="primary-button mt-6" disabled={publishPending}>{publishPending ? "Publishing…" : "Publish site"}</button>
      {!publishState.success && <Notice state={publishState} />}
      <Notice state={unpublishState} />
    </form> : <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">Purchase this wedding site to choose its permanent URL and publish it. Your draft and private preview remain available without payment.</p>}
  </>;
}
