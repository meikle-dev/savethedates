"use client";

import Image from "next/image";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { changePhoto, type PhotoFormState } from "./publication-actions";
import { PhotoPrepareError, prepareUpload } from "./photo-resize";
import type { PhotoFraming } from "@/features/weddings/photo-framing";
import type { WeddingTheme } from "@/features/weddings/themes";
import { PhotoFramingEditor } from "./photo-framing-editor";

export function PhotoForm({ published, photo, photoFraming, theme }: { published: boolean; photo: boolean; photoFraming: PhotoFraming; theme: WeddingTheme }) {
  const [photoState, photoAction, photoPending] = useActionState<PhotoFormState, FormData>(changePhoto, {});
  const [fileError, setFileError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const busy = photoPending || preparing;
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

  async function photoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setFileError("");
    setPreparing(true);
    let upload: File;
    try {
      upload = await prepareUpload(file);
    } catch (error) {
      // The button is disabled while preparing; re-render it enabled before moving focus back to it.
      flushSync(() => {
        setPreparing(false);
        setFileError(error instanceof PhotoPrepareError ? error.message : "We couldn’t read that photo. Choose a still JPEG, PNG or WebP.");
      });
      input.value = "";
      photoButton.current?.focus();
      return;
    }
    const form = new FormData();
    form.set("photo", upload);
    // setPreparing may only commit when the action finishes, so the upload's pending state takes precedence above.
    startTransition(() => {
      setPreparing(false);
      photoAction(form);
    });
  }

  return <>
    <p className="field-help mt-2">Optional. Your site looks lovely without one, too. {photoPresent ? "Your saved photo is shown below." : "No photo added yet."}</p>
    {photoPresent && <div className="mt-5 max-w-sm overflow-hidden rounded-md border border-[var(--line)] bg-white/60 p-2">
      <Image key={photoRevision} src={`/dashboard/photo?revision=${encodeURIComponent(photoRevision)}`} alt="Your saved wedding photo" width={800} height={600} unoptimized className="aspect-4/3 h-auto w-full rounded-sm object-contain" />
    </div>}
    <div className="mt-6" aria-busy={busy}>
      <input ref={photoInput} id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Photo file" aria-describedby="photo-help" onChange={photoSelected} />
      <p id="photo-help" className="field-help">A JPEG, PNG or WebP photo, up to 60 MB. Large photos are made smaller on your device before they upload. Still photos only.</p>
      {fileError && <p role="alert" className="form-error mt-4">{fileError}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button ref={photoButton} type="button" className="button button-primary" onClick={choosePhoto} disabled={busy}>{photoPending ? "Uploading photo…" : preparing ? "Preparing photo…" : photoPresent ? "Change photo" : "Choose photo"}</button>
      </div>
      {preparing && !photoPending && <p className="form-notice mt-4" role="status">Preparing your photo…</p>}
      {photoPending && <p className="form-notice mt-4" role="status">Uploading and processing your photo…</p>}
      {!busy && !fileError && photoState.message && <p className={`mt-4 ${photoState.success ? "form-notice" : "form-error"}`} role={photoState.success ? "status" : "alert"}>{photoState.message}</p>}
    </div>
    {photoPresent && <form action={photoAction} className="mt-3"><button name="intent" value="remove" className="button button-quiet button-flush" disabled={busy} onClick={() => setFileError("")}>Remove photo</button></form>}
    {published && <p className="field-help mt-3">A successful photo change updates your live site immediately.</p>}
    {photoPresent && <PhotoFramingEditor key={`${theme}-${photoRevision}`} theme={theme} framing={photoState.success ? {} : photoFraming} published={published} />}
  </>;
}
