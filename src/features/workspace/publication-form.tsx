"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { changePhoto, publishWedding, unpublishWedding, type PhotoFormState } from "./publication-actions";
import type { FormState } from "@/features/account/validation";
import { PurchasePanel, type Entitlement } from "@/features/payments/purchase-panel";

function Notice({ state }: { state: FormState }) {
  return state.message ? <p className={`mt-4 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p> : null;
}
export function PublicationForm({ slug, published, photo, locked, entitlement, checkout }: { slug: string | null; published: boolean; photo: boolean; locked: boolean; entitlement: Entitlement; checkout?: string }) {
  const [url, setUrl] = useState(slug ?? "");
  const [visibility, setVisibility] = useState(false);
  const [photoState, photoAction, photoPending] = useActionState<PhotoFormState, FormData>(changePhoto, {});
  const [publishState, publishAction, publishPending] = useActionState<FormState, FormData>(publishWedding, {});
  const [unpublishState, unpublishAction, unpublishPending] = useActionState<FormState, FormData>(unpublishWedding, {});
  const [fileError, setFileError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const photoButton = useRef<HTMLButtonElement>(null);
  const wasPhotoPending = useRef(false);
  const photoPresent = photoState.success && photoState.photoPresent !== undefined ? photoState.photoPresent : photo;
  const photoRevision = photoState.photoRevision ?? "saved";

  useEffect(() => {
    if (photoPending) {
      wasPhotoPending.current = true;
      return;
    }
    if (!wasPhotoPending.current) return;
    wasPhotoPending.current = false;
    if (photoInput.current) photoInput.current.value = "";
    photoButton.current?.focus();
  }, [photoPending, photoState]);

  function choosePhoto() {
    photoInput.current?.click();
  }

  function photoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Choose a photo up to 5 MiB.");
      event.currentTarget.value = "";
      photoButton.current?.focus();
      return;
    }
    setFileError("");
    event.currentTarget.form?.requestSubmit();
  }

  return <>
    <section aria-labelledby="photo-title" className="mt-12 border-t border-[var(--line)] pt-8">
      <h2 id="photo-title" className="text-xl font-medium">Your photo</h2>
      <p className="field-help mt-2">Optional. Your site looks lovely without one, too. {photoPresent ? "Your saved photo is shown below." : "No photo added yet."}</p>
      {photoPresent && <div className="mt-5 max-w-sm overflow-hidden rounded-md border border-[var(--line)] bg-white/60 p-2">
        <Image key={photoRevision} src={`/dashboard/photo?revision=${encodeURIComponent(photoRevision)}`} alt="Your saved wedding photo" width={800} height={600} unoptimized className="aspect-4/3 h-auto w-full rounded-sm object-contain" />
      </div>}
      <form action={photoAction} className="mt-6" aria-busy={photoPending}>
        <input ref={photoInput} id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Photo file" aria-describedby="photo-help" onChange={photoSelected} />
        <p id="photo-help" className="field-help">JPEG, PNG or WebP, up to 5 MiB and 25 megapixels. Still photos only.</p>
        {fileError && <p role="alert" className="form-error mt-4">{fileError}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button ref={photoButton} type="button" className="primary-button" onClick={choosePhoto} disabled={photoPending}>{photoPending ? "Uploading photo…" : photoPresent ? "Change photo" : "Choose photo"}</button>
        </div>
        {photoPending && <p className="form-notice mt-4" role="status">Uploading and processing your photo…</p>}
        {!photoPending && !fileError && <Notice state={photoState} />}
      </form>
      {photoPresent && <form action={photoAction} className="mt-3"><button name="intent" value="remove" className="text-link min-h-11" disabled={photoPending} onClick={() => setFileError("")}>Remove photo</button></form>}
      {published && <p className="field-help mt-3">A successful photo change updates your live site immediately.</p>}
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
