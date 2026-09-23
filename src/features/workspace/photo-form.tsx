"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { changePhoto, type PhotoFormState } from "./publication-actions";
import type { PhotoFraming } from "@/features/weddings/photo-framing";
import type { WeddingTheme } from "@/features/weddings/themes";
import { PhotoFramingEditor } from "./photo-framing-editor";

export function PhotoForm({ published, photo, photoFraming, theme }: { published: boolean; photo: boolean; photoFraming: PhotoFraming; theme: WeddingTheme }) {
  const [photoState, photoAction, photoPending] = useActionState<PhotoFormState, FormData>(changePhoto, {});
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
    <p className="field-help mt-2">Optional. Your site looks lovely without one, too. {photoPresent ? "Your saved photo is shown below." : "No photo added yet."}</p>
    {photoPresent && <div className="mt-5 max-w-sm overflow-hidden rounded-md border border-[var(--line)] bg-white/60 p-2">
      <Image key={photoRevision} src={`/dashboard/photo?revision=${encodeURIComponent(photoRevision)}`} alt="Your saved wedding photo" width={800} height={600} unoptimized className="aspect-4/3 h-auto w-full rounded-sm object-contain" />
    </div>}
    <form action={photoAction} className="mt-6" aria-busy={photoPending}>
      <input ref={photoInput} id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Photo file" aria-describedby="photo-help" onChange={photoSelected} />
      <p id="photo-help" className="field-help">JPEG, PNG or WebP, up to 5 MiB and 25 megapixels. Still photos only.</p>
      {fileError && <p role="alert" className="form-error mt-4">{fileError}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button ref={photoButton} type="button" className="button button-primary" onClick={choosePhoto} disabled={photoPending}>{photoPending ? "Uploading photo…" : photoPresent ? "Change photo" : "Choose photo"}</button>
      </div>
      {photoPending && <p className="form-notice mt-4" role="status">Uploading and processing your photo…</p>}
      {!photoPending && !fileError && photoState.message && <p className={`mt-4 ${photoState.success ? "form-notice" : "form-error"}`} role={photoState.success ? "status" : "alert"}>{photoState.message}</p>}
    </form>
    {photoPresent && <form action={photoAction} className="mt-3"><button name="intent" value="remove" className="button button-quiet button-flush" disabled={photoPending} onClick={() => setFileError("")}>Remove photo</button></form>}
    {published && <p className="field-help mt-3">A successful photo change updates your live site immediately.</p>}
    {photoPresent && <PhotoFramingEditor key={`${theme}-${photoRevision}`} theme={theme} framing={photoState.success ? {} : photoFraming} published={published} />}
  </>;
}
