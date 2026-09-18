import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { AuthForm } from "@/features/account/auth-form";
import { createClient } from "@/lib/supabase/server";

const screens = {
  "sign-in": { title: "Welcome back.", intro: "Your wedding starts with the two of you. Pick up where you left off." },
  "sign-up": { title: "A little beginning.", intro: "Create your account and start a private draft of your wedding website." },
  recovery: { title: "Let’s get you back in.", intro: "Enter your email and we’ll send you a link to choose a new password." },
  password: { title: "A fresh start.", intro: "Choose a new password for your account." },
};

export default async function AccountPage({ params, searchParams }: { params: Promise<{ screen: string }>; searchParams: Promise<{ error?: string }> }) {
  const { screen } = await params;
  if (!Object.hasOwn(screens, screen)) notFound();
  const mode = screen as keyof typeof screens;
  if (mode === "password") {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) redirect("/account/recovery?error=expired");
  }
  const { error } = await searchParams;
  return <AccountShell>
    <p className="eyebrow">Your wedding, together</p>
    <h1 className="editorial mt-4 text-4xl leading-tight md:text-5xl">{screens[mode].title}</h1>
    <p className="mt-5 leading-relaxed text-[var(--muted)]">{screens[mode].intro}</p>
    {error && <p role="alert" className="form-error mt-6">This link is invalid or has expired. Request a new reset link, or sign up again for a new confirmation email.</p>}
    <AuthForm mode={mode} />
    <nav aria-label="Account options" className="mt-8 flex flex-col gap-5 text-center text-sm">
      {mode !== "sign-in" && <Link className="text-link" href="/account/sign-in">Already have an account? Sign in</Link>}
      {mode === "sign-in" && <><Link className="text-link" href="/account/recovery">Forgot your password?</Link><Link className="text-link" href="/account/sign-up">New here? Create an account</Link></>}
    </nav>
  </AccountShell>;
}
