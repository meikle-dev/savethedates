"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestRecovery, signIn, signUp, updatePassword } from "./actions";
import type { FormState } from "./validation";

const modes = {
  "sign-in": { action: signIn, label: "Sign in" },
  "sign-up": { action: signUp, label: "Create account" },
  recovery: { action: requestRecovery, label: "Send reset link" },
  password: { action: updatePassword, label: "Save new password" },
};

export function AuthForm({ mode }: { mode: keyof typeof modes }) {
  const [state, action, pending] = useActionState<FormState, FormData>(modes[mode].action, {});
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="mt-8 space-y-6">
      {mode !== "password" && <div>
        <label htmlFor="email" className="field-label">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" aria-invalid={!!state.errors?.email} aria-describedby={state.errors?.email ? "email-error" : undefined} />
        {state.errors?.email && <p id="email-error" className="field-error">{state.errors.email[0]}</p>}
      </div>}
      {mode !== "recovery" && <div>
        <label htmlFor="password" className="field-label">{mode === "password" ? "New password" : "Password"}</label>
        <input id="password" name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={mode === "sign-in" ? 1 : 12} maxLength={128} className="field-input" aria-invalid={!!state.errors?.password} aria-describedby="password-help" />
        <p id="password-help" className={state.errors?.password ? "field-error" : "field-help"}>{state.errors?.password?.[0] ?? (mode === "sign-in" ? "Use the password for your account." : "Use 12–128 characters. A longer passphrase works well.")}</p>
      </div>}
      {state.message && <p role={state.success ? "status" : "alert"} className={state.success ? "form-notice" : "form-error"}>{state.message}</p>}
      <button className="primary-button w-full" disabled={pending}>{pending ? "Please wait…" : modes[mode].label}</button>
      {mode === "password" && state.success && <Link className="text-link block text-center" href="/dashboard">Return to your workspace</Link>}
    </form>
  );
}
