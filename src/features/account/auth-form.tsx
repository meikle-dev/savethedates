"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestRecovery, resendConfirmation, signIn, signInDemo, signInWithGoogle, signUp, updatePassword } from "./actions";
import type { FormState } from "./validation";
import { LegalAgreement } from "@/features/marketing/legal-agreement";

const modes = {
  "sign-in": { action: signIn, label: "Sign in" },
  "sign-up": { action: signUp, label: "Create account" },
  recovery: { action: requestRecovery, label: "Send reset link" },
  password: { action: updatePassword, label: "Save new password" },
};

type Mode = keyof typeof modes;

export function ExpiredConfirmationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resendConfirmation, {});
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.errors?.email) emailRef.current?.focus();
  }, [state]);

  return <form action={action} noValidate className="mt-8 space-y-5">
    <div>
      <label htmlFor="resend-email" className="field-label">Email address</label>
      <input ref={emailRef} id="resend-email" name="email" type="email" autoComplete="email" required maxLength={254} className="field-input" aria-invalid={!!state.errors?.email} aria-describedby={state.errors?.email ? "resend-email-error" : undefined} />
      {state.errors?.email && <p id="resend-email-error" role="alert" className="field-error">{state.errors.email[0]}</p>}
    </div>
    <button className="button button-primary w-full" disabled={pending}>{pending ? "Please wait…" : "Resend confirmation link"}</button>
    {state.message && <p role="status" className="form-notice">{state.message}</p>}
    <div className="flex flex-col gap-4 text-center text-sm"><Link className="text-link" href="/account/sign-up">Create a new account</Link><Link className="text-link" href="/account/sign-in">Sign in</Link></div>
  </form>;
}

function ConfirmationInbox({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resendConfirmation, {});

  return <section className="mt-8 space-y-5" aria-labelledby="confirmation-heading">
    <h1 id="confirmation-heading" className="editorial text-4xl leading-tight md:text-5xl">Check your inbox</h1>
    <p role="status" className="form-notice">Check your email at <strong className="break-all">{email}</strong> for a confirmation link. If you already have an account, you can sign in or reset your password.</p>
    <p className="text-sm leading-relaxed text-[var(--muted)]">The message is sent by our account service. It may take a few minutes; check your spam folder too. This page does not confirm that an email was delivered.</p>
    <form action={action} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      <button className="button button-secondary w-full" disabled={pending}>{pending ? "Please wait…" : "Resend confirmation link"}</button>
      {state.message && <p role="status" className="form-notice">{state.message}</p>}
      {state.errors?.email && <p role="alert" className="form-error">Please change the email address and try again.</p>}
    </form>
    <div className="flex flex-col gap-4 text-center text-sm sm:flex-row sm:justify-between">
      <button type="button" className="text-link" onClick={onChangeEmail}>Change email</button>
      <Link className="text-link" href="/account/sign-in">Sign in</Link>
    </div>
  </section>;
}

function GoogleMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>;
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return <button className="button button-secondary w-full" disabled={pending}><GoogleMark />{pending ? "Opening Google…" : "Continue with Google"}</button>;
}

function GoogleSignIn() {
  return <>
    <form action={signInWithGoogle} className="mt-8"><GoogleSubmit /></form>
    <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]" aria-hidden="true"><span className="h-px flex-1 bg-[var(--line)]" />or use your email<span className="h-px flex-1 bg-[var(--line)]" /></div>
  </>;
}

function AuthFields({ mode, development, google, initialEmail, onChangeEmail }: {
  mode: Mode;
  development: boolean;
  google: boolean;
  initialEmail: string;
  onChangeEmail: (email: string) => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(modes[mode].action, {});
  const [email, setEmail] = useState(initialEmail);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.errors?.email) emailRef.current?.focus();
    else if (state.errors?.password) passwordRef.current?.focus();
    else if (state.message && !state.success) messageRef.current?.focus();
  }, [state]);

  if (mode === "sign-up" && state.success && state.submittedEmail) {
    return <ConfirmationInbox email={state.submittedEmail} onChangeEmail={() => onChangeEmail(state.submittedEmail!)} />;
  }

  const passwordError = state.errors?.password?.[0];
  const showGoogle = google && (mode === "sign-in" || mode === "sign-up");
  return <>
    {mode === "sign-up" && <><h1 className="editorial mt-4 text-4xl leading-tight md:text-5xl">A little beginning.</h1><p className="mt-5 leading-relaxed text-[var(--muted)]">Create your account and start a private draft of your wedding website.</p></>}
    {showGoogle && <GoogleSignIn />}
    <form action={action} noValidate className={showGoogle ? "mt-6 space-y-6" : "mt-8 space-y-6"}>
      {mode !== "password" && <div>
        <label htmlFor="email" className="field-label">Email address</label>
        <input ref={emailRef} id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" aria-invalid={!!state.errors?.email} aria-describedby={state.errors?.email ? "email-error" : undefined} />
        {state.errors?.email && <p id="email-error" role="alert" className="field-error">{state.errors.email[0]}</p>}
      </div>}
      {mode !== "recovery" && <div>
        <label htmlFor="password" className="field-label">{mode === "password" ? "New password" : "Password"}</label>
        <div className="relative">
          <input ref={passwordRef} id="password" name="password" type={passwordVisible ? "text" : "password"} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={mode === "sign-in" ? 1 : 12} maxLength={128} className="field-input pr-20" aria-invalid={!!passwordError} aria-describedby="password-help" />
          <button type="button" className="absolute inset-y-0 right-1 min-w-16 rounded px-2 text-sm text-[var(--teal)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px]" aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? "Hide" : "Show"}</button>
        </div>
        <p id="password-help" role={passwordError ? "alert" : undefined} className={passwordError ? "field-error" : "field-help"}>{passwordError ?? (mode === "sign-in" ? "Use the password for your account." : "Use 12–128 characters. A longer passphrase works well.")}</p>
      </div>}
      {state.message && <p ref={messageRef} tabIndex={state.success ? undefined : -1} role={state.success ? "status" : "alert"} className={state.success ? "form-notice" : "form-error"}>{state.message}</p>}
      <button className="button button-primary w-full" disabled={pending}>{pending ? "Please wait…" : modes[mode].label}</button>
      {mode === "password" && state.success && <Link className="text-link block text-center" href="/dashboard">Return to your workspace</Link>}
    </form>
    {mode === "sign-up" && <LegalAgreement action={showGoogle ? "creating an account or continuing with Google" : "creating an account"} />}
    {mode === "sign-in" && showGoogle && <LegalAgreement action="continuing with Google" />}
    {mode === "sign-up" && <Link className="text-link mt-8 block text-center text-sm" href="/account/sign-in">Already have an account? Sign in</Link>}
    {mode === "sign-in" && development && <>
      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]" aria-hidden="true"><span className="h-px flex-1 bg-[var(--line)]" />or<span className="h-px flex-1 bg-[var(--line)]" /></div>
      <form action={signInDemo} className="mt-6 space-y-3 rounded-md border border-dashed border-[var(--line)] p-4">
        <p className="text-sm leading-relaxed text-[var(--muted)]">Local development shortcut. It uses a seeded, fictional account and never appears in production.</p>
        <button className="button button-secondary w-full">Use local demo account</button>
      </form>
    </>}
  </>;
}

export function AuthForm({ mode, development = false, google = false }: { mode: Mode; development?: boolean; google?: boolean }) {
  const [version, setVersion] = useState(0);
  const [initialEmail, setInitialEmail] = useState("");
  return <AuthFields key={version} mode={mode} development={development} google={google} initialEmail={initialEmail} onChangeEmail={(email) => {
    setInitialEmail(email);
    setVersion((value) => value + 1);
  }} />;
}
