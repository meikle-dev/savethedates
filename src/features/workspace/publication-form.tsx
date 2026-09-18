"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { changePhoto, publishWedding, unpublishWedding } from "./publication-actions";
import type { FormState } from "@/features/account/validation";
import { PurchasePanel, type Entitlement } from "@/features/payments/purchase-panel";

function Notice({ state }: { state: FormState }) {
  return state.message ? <p className={`mt-4 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p> : null;
}
export function PublicationForm({ slug, published, photo, locked, entitlement, checkout }: { slug: string | null; published: boolean; photo: boolean; locked: boolean; entitlement: Entitlement; checkout?: string }) {
  const [url, setUrl] = useState(slug ?? "");
  const [visibility, setVisibility] = useState(false);
  const [photoState, photoAction, photoPending] = useActionState<FormState, FormData>(changePhoto, {});
  const [publishState, publishAction, publishPending] = useActionState<FormState, FormData>(publishWedding, {});
  const [unpublishState, unpublishAction, unpublishPending] = useActionState<FormState, FormData>(unpublishWedding, {});
  const [fileError, setFileError] = useState("");
  return <>
    <section aria-labelledby="photo-title" className="mt-12 border-t border-[var(--line)] pt-8">
      <h2 id="photo-title" className="text-xl font-medium">Your photo</h2>
      <p className="field-help mt-2">Optional. Your site looks lovely without one, too. {photo ? "A photo is saved. View it in your preview." : "No photo added yet."}</p>
      <form action={photoAction} className="mt-6">
        <label htmlFor="photo" className="field-label">Choose a photo</label>
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="field-input" aria-describedby="photo-help" onChange={(event) => setFileError((event.target.files?.[0]?.size ?? 0) > 5 * 1024 * 1024 ? "Choose a photo up to 5 MiB." : "")} />
        <p id="photo-help" className="field-help">JPEG, PNG or WebP, up to 5 MiB and 25 megapixels. Still photos only.</p>
        {fileError && <p role="alert" className="form-error mt-4">{fileError}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button name="intent" value="upload" className="primary-button" disabled={photoPending || !!fileError}>{photoPending ? "Saving…" : photo ? "Replace photo" : "Upload photo"}</button>
        </div>
        <Notice state={photoState} />
      </form>
      {photo && <form action={photoAction} className="mt-3"><button name="intent" value="remove" className="text-link min-h-11" disabled={photoPending}>Remove photo</button></form>}
    </section>
    <section aria-labelledby="share-title" className="mt-12 border-t border-[var(--line)] pt-8">
      <h2 id="share-title" className="text-xl font-medium">Share your site</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">Preview your saved details before sharing. Save any changes above first.</p>
      <Link href="/dashboard/preview" prefetch={false} className="text-link mt-4 inline-flex min-h-11 items-center">Preview saved site</Link>
      <PurchasePanel entitlement={entitlement} checkout={checkout} />
      {published ? <>
        <p className="mt-4 break-all">Your wedding URL: <a className="text-link" href={`/${slug}`}>/{slug}</a></p>
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
    </section>
  </>;
}
