"use client";

import { useActionState } from "react";
import type { WeddingTheme } from "@/features/weddings/themes";
import { applyTheme } from "./theme-action";

export function ThemeApplyForm({ theme, published }: { theme: WeddingTheme; published: boolean }) {
  const [state, action, pending] = useActionState(applyTheme, {});
  return <form action={action} className="mt-5">
    <input type="hidden" name="theme" value={theme} />
    <p className="text-sm leading-relaxed">{published ? "Applying this theme updates your public site immediately." : "Applying this theme saves it to your private draft."} Your content and URL stay the same.</p>
    <button className="primary-button mt-3" disabled={pending}>{pending ? "Applying..." : "Apply theme"}</button>
    {state.message && <p role={state.success ? "status" : "alert"} className={`mt-3 ${state.success ? "form-notice" : "form-error"}`}>{state.message}</p>}
  </form>;
}
