"use client";

import { useActionState, useRef, useState } from "react";
import { WeddingPhoto } from "@/features/weddings/wedding-photo";
import { defaultPhotoFrame, resolvePhotoFrame, type PhotoFrame, type PhotoFraming, type PhotoPage } from "@/features/weddings/photo-framing";
import { themes, type WeddingTheme } from "@/features/weddings/themes";
import { savePhotoFraming, type PhotoFramingFormState } from "./photo-framing-action";

const pageLabels: Record<PhotoPage, string> = { saveTheDate: "Save the Date", details: "Details" };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function CropPreview({ page, theme, frame, size, onChange }: { page: PhotoPage; theme: WeddingTheme; frame: PhotoFrame; size: "mobile" | "desktop"; onChange: (frame: PhotoFrame) => void }) {
  const drag = useRef<{ pointer: number; clientX: number; clientY: number; frame: PhotoFrame } | null>(null);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointer !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp(drag.current.frame.x - ((event.clientX - drag.current.clientX) / bounds.width) * 100 / frame.zoom, 0, 100);
    const y = clamp(drag.current.frame.y - ((event.clientY - drag.current.clientY) / bounds.height) * 100 / frame.zoom, 0, 100);
    onChange({ ...frame, x: Math.round(x), y: Math.round(y) });
  }

  return <figure className="min-w-0">
    <figcaption className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{size}</figcaption>
    <div
      className="photo-framing-viewport wedding-shell"
      data-theme={theme}
      data-page={page}
      data-preview-size={size}
      aria-label={`${pageLabels[page]} ${size} photo crop. Drag to reposition.`}
      onPointerDown={(event) => {
        event.preventDefault();
        drag.current = { pointer: event.pointerId, clientX: event.clientX, clientY: event.clientY, frame };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        drag.current = null;
      }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <WeddingPhoto image={{ src: "/dashboard/photo", alt: "" }} frame={frame} />
    </div>
  </figure>;
}

export function PhotoFramingEditor({ theme, framing, published }: { theme: WeddingTheme; framing: PhotoFraming; published: boolean }) {
  const initial = {
    saveTheDate: resolvePhotoFrame(framing, theme, "saveTheDate"),
    details: resolvePhotoFrame(framing, theme, "details"),
  };
  const [page, setPage] = useState<PhotoPage>("saveTheDate");
  const saved = useRef(initial);
  const [drafts, setDrafts] = useState(initial);
  const [state, action, pending] = useActionState<PhotoFramingFormState, FormData>(async (previous, form) => {
    const result = await savePhotoFraming(previous, form);
    if (result.success && result.page && result.frame) {
      saved.current = { ...saved.current, [result.page]: result.frame };
      setDrafts((current) => ({ ...current, [result.page!]: result.frame! }));
    }
    return result;
  }, {});
  const frame = drafts[page];
  const themeName = themes.find((option) => option.id === theme)!.name;

  function change(next: PhotoFrame) {
    setDrafts((current) => ({ ...current, [page]: next }));
  }

  return <div className="photo-framing-editor mt-8 border-t border-[var(--line)] pt-7">
    <h3 className="text-lg font-medium">Frame your photo</h3>
    <p className="field-help mt-2">Editing {themeName}. Save the Date and Details keep separate crops. Phone and desktop frames have different shapes, so each preview may crop a little differently.</p>
    {published && <p className="field-help mt-2">Saving framing updates your live site immediately.</p>}
    <fieldset className="mt-5">
      <legend className="sr-only">Page to frame</legend>
      <div className="segmented segmented-fill">
        {(["saveTheDate", "details"] as const).map((option) => <label key={option} className="segment">
          <input type="radio" name="framing-page-picker" value={option} checked={page === option} onChange={() => setPage(option)} disabled={pending} />
          {pageLabels[option]}
        </label>)}
      </div>
    </fieldset>
    <div className="photo-framing-previews mt-6">
      <CropPreview page={page} theme={theme} frame={frame} size="mobile" onChange={change} />
      <CropPreview page={page} theme={theme} frame={frame} size="desktop" onChange={change} />
    </div>
    <p className="field-help mt-3">Drag either preview to reposition, or use the controls below for keyboard-precise changes.</p>
    <form action={action} className="mt-6" aria-busy={pending}>
      <input type="hidden" name="theme" value={theme} />
      <input type="hidden" name="page" value={page} />
      <div className="grid gap-5 sm:grid-cols-3">
        {([
          ["x", "Horizontal position", 0, 100, 1],
          ["y", "Vertical position", 0, 100, 1],
          ["zoom", "Zoom", 1, 2, 0.01],
        ] as const).map(([key, label, min, max, step]) => <label key={key} className="block text-sm font-semibold">
          <span className="flex justify-between gap-3"><span>{label}</span><output>{key === "zoom" ? `${frame[key].toFixed(2)}x` : `${Math.round(frame[key])}%`}</output></span>
          <input className="mt-3 w-full" type="range" name={key} min={min} max={max} step={step} value={frame[key]} onChange={(event) => change({ ...frame, [key]: Number(event.target.value) })} disabled={pending} />
        </label>)}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="button button-primary" disabled={pending}>{pending ? "Saving framing…" : `Save ${pageLabels[page]} framing`}</button>
        <button type="button" className="button button-quiet" disabled={pending} onClick={() => change(defaultPhotoFrame(page))}>Reset</button>
        <button type="button" className="button button-quiet" disabled={pending} onClick={() => change(saved.current[page])}>Cancel</button>
      </div>
      {state.message && (!state.success || state.page === page) && <p className={`mt-4 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
    </form>
  </div>;
}
