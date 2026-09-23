"use client";

import { useActionState } from "react";
import type { WeddingTheme } from "@/features/weddings/themes";
import { applyTheme } from "./theme-action";

export function ThemeApplyForm({ theme, name, current, published }: { theme: WeddingTheme; name: string; current: boolean; published: boolean }) {
  const [state, action, pending] = useActionState(applyTheme, {});
  return <form action={action} className="preview-apply">
    <input type="hidden" name="theme" value={theme} />
    <div className="preview-apply-text">
      {current
        ? <p>This is your current theme.</p>
        : <p><strong>{name}</strong> · Preview only — this theme has not been applied. <span className="preview-apply-hint">{published ? "Applying this theme updates your public site immediately." : "Applying this theme saves it to your private draft."} Your content and URL stay the same.</span></p>}
      {state.message && <p role={state.success ? "status" : "alert"} className={state.success ? "preview-apply-success" : "form-error"}>{state.message}</p>}
    </div>
    <button className="button button-primary" disabled={current || pending}>{current ? "Applied" : pending ? "Applying…" : "Apply theme"}</button>
  </form>;
}
