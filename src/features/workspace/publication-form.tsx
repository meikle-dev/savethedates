"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { guestUrl, reservedNames } from "@/features/weddings/guest-link";
import { publishWedding, saveGuestLinkNames, unpublishWedding } from "./publication-actions";
import { GuestLinkPanel, type GuestLinkShare } from "./guest-link-panel";
import { Icon } from "./workspace-icons";
import type { RsvpReadiness } from "./workspace-data";
import type { FormState } from "@/features/account/validation";
import { PurchasePanel, type Entitlement } from "@/features/payments/purchase-panel";

function Notice({ state }: { state: FormState }) {
  return state.message ? <p className={`mt-4 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p> : null;
}

// The names part can be saved at any time; before publication the same field is submitted with the consent.
// Validation is server-side and shown as field messages, so no browser pop-up hides another error.
// While live, the shareable guest link panel leads the page (F042); before that only the future link is shown, marked as not
// yet working. `origin` is the configured APP_ORIGIN, never the request host.
// Before publishing, RSVP readiness is stated next to the future link; publishing never changes RSVP settings, and an
// announcement-only site (RSVPs off) can still be published deliberately.
export function PublicationForm({ origin, names, secret, published, offline, entitlement, checkout, share, rsvp }: { origin: string; names: string; secret: string; published: boolean; offline: boolean; entitlement: Entitlement; checkout?: string; share: GuestLinkShare | null; rsvp: RsvpReadiness }) {
  const [url, setUrl] = useState(names);
  const [visibility, setVisibility] = useState(false);
  const [publishState, publishAction, publishPending] = useActionState<FormState, FormData>(publishWedding, {});
  const [namesState, namesAction, namesPending] = useActionState<FormState, FormData>(saveGuestLinkNames, {});
  // A later save on the same visit retires the "published" notice; a new publish result shows it again.
  const [retiredNotice, setRetiredNotice] = useState<FormState | null>(null);
  const [unpublishState, unpublishAction, unpublishPending] = useActionState<FormState, FormData>(unpublishWedding, {});
  const publishing = !published && entitlement.active;
  const state = publishing ? publishState : namesState;
  const pending = publishing ? publishPending : namesPending;
  const slugError = state.errors?.slug?.[0];
  const consentError = publishing ? publishState.errors?.visibility?.[0] : undefined;
  // Preview what the couple types only once it is a valid names part; the server validates again on save.
  const typed = url.trim();
  const valid = typed.length >= 3 && typed.length <= 63 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(typed) && !reservedNames.has(typed);
  const futureLink = guestUrl(origin, valid ? typed : names, secret);
  // Publishing success is announced in the guest link panel; keeping it here would outlive a later unpublish.
  const notice = publishing && state.success ? {} : state;

  return <>
    {published && share && <GuestLinkPanel {...share} justPublished={!!publishState.success && retiredNotice !== publishState} />}
    <div className="ws-panel">
      {published && <h2>Manage your site</h2>}
      <p className="ws-panel-intro">Preview your saved details before sharing. Save changes in each section first.</p>
      <Link href="/dashboard/preview" prefetch={false} className="button button-secondary mt-4"><Icon name="eye" />Preview saved site</Link>
      <PurchasePanel entitlement={entitlement} checkout={checkout} />
      {!published && <section className="mt-6" aria-labelledby="future-link-title">
        <h3 id="future-link-title" className="text-lg font-medium">Your guest link</h3>
        <p className="guest-link-url font-mono" data-pending="" translate="no">{futureLink}</p>
        <p className="field-help"><span className="badge"><Icon name="lock" />{offline ? "Currently offline" : "Works once published"}</span></p>
        <p className="field-help">{offline ? "This is your existing guest link. It will work again if you purchase a new site period. Guests cannot use it while the site is offline." : <>This one private link opens every page of your site. Once published, anyone who has it can view your site{rsvp.availability === "not-live" ? " and reply" : ""}. You can share it after publishing.</>}</p>
        {rsvp.availability === "not-live"
          ? <p className="field-help"><span className="badge badge-positive">{rsvp.label}</span> {rsvp.note}</p>
          : <div className="form-warning mt-4" role="note"><p><strong>Guests won’t be able to reply.</strong> {rsvp.note}</p>{rsvp.availability !== "offline" && <p className="mt-2"><Link href="/dashboard/rsvp" className="text-link">Open RSVP settings</Link>, or publish as an announcement only.</p>}</div>}
      </section>}
      <form action={publishing ? publishAction : (form) => { setRetiredNotice(publishState); namesAction(form); }} className="mt-6" noValidate>
        <label htmlFor="slug" className="field-label">Names in your guest link</label>
        <input id="slug" name="slug" className="field-input" value={url} onChange={(event) => setUrl(event.target.value.toLowerCase())} onBlur={() => setUrl(url.trim())} maxLength={63} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={!!slugError} aria-describedby={slugError ? "slug-error slug-help" : "slug-help"} />
        {slugError && <p id="slug-error" className="field-error">{slugError}</p>}
        <p id="slug-help" className="field-help">3–63 letters or numbers, with single hyphens, for example alex-and-morgan. Other couples may use the same names; the private code after them makes your link unique. You can change the names at any time, and links you already shared keep working.</p>
        {publishing && <>
          <label className="mt-6 flex items-start gap-3 text-sm leading-relaxed"><input name="visibility" type="checkbox" checked={visibility} onChange={(event) => setVisibility(event.target.checked)} className="mt-1 size-5 shrink-0" aria-invalid={!!consentError} aria-describedby={consentError ? "visibility-error" : undefined} /><span>I understand that anyone with our guest link can view and copy our names, date, location, message and photo. Unpublishing cannot recall downloaded copies.</span></label>
          {consentError && <p id="visibility-error" className="field-error">{consentError}</p>}
        </>}
        <button className="button button-primary mt-6" disabled={pending}>{publishing ? publishPending ? "Publishing…" : "Publish site" : namesPending ? "Saving…" : "Save link names"}</button>
        <Notice state={notice} />
      </form>
      {!published && !entitlement.active && <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">{offline ? "Purchase a new site period to restore guest access. Your saved site and private preview remain available." : "Purchase this wedding site to publish it. You can choose the names in your guest link now. Your draft and private preview remain available without payment."}</p>}
      {published && <>
        <p className="field-help mt-6">Saved details and photo changes are immediately visible to guests.</p>
        <form action={unpublishAction} className="mt-6">
          <p className="mb-4 text-sm leading-relaxed">Unpublishing hides your site and photo on new visits. It cannot remove copies someone has already downloaded.</p>
          <button className="button button-secondary" disabled={unpublishPending}>{unpublishPending ? "Unpublishing…" : "Unpublish site"}</button>
          {!unpublishState.success && <Notice state={unpublishState} />}
        </form>
      </>}
      {!published && unpublishState.success && <Notice state={unpublishState} />}
    </div>
  </>;
}
