import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { AuthForm, ExpiredConfirmationForm } from "@/features/account/auth-form";
import { createClient } from "@/lib/supabase/server";

const screens = {
  "sign-in": { title: "Welcome back.", intro: "Your wedding starts with the two of you. Pick up where you left off." },
  "sign-up": { title: "A little beginning.", intro: "Create your account and start a private draft of your wedding website." },
  recovery: { title: "Let’s get you back in.", intro: "Enter your email and we’ll send you a link to choose a new password." },
  password: { title: "A fresh start.", intro: "Choose a new password for your account." },
};

const screenTitles: Record<keyof typeof screens, string> = {
  "sign-in": "Sign in",
  "sign-up": "Create an account",
  recovery: "Reset your password",
  password: "Choose a new password",
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ screen: string }>; searchParams: Promise<{ error?: string }> }): Promise<Metadata> {
  const { screen } = await params;
  if (!Object.hasOwn(screenTitles, screen)) return { title: "Page not found | SaveTheDates" };
  const title = screen === "sign-up" && (await searchParams).error === "expired" ? "Confirm your account" : screenTitles[screen as keyof typeof screens];
  return { title: `${title} | SaveTheDates` };
}

export default async function AccountPage({ params, searchParams }: { params: Promise<{ screen: string }>; searchParams: Promise<{ error?: string; demo?: string }> }) {
  const { screen } = await params;
  if (!Object.hasOwn(screens, screen)) notFound();
  const mode = screen as keyof typeof screens;
  if (mode === "password") {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) redirect("/account/recovery?error=expired");
  }
  const { error, demo } = await searchParams;
  return <AccountShell>
    <p className="eyebrow">Your wedding, together</p>
    {(mode !== "sign-up" || error === "expired") && <><h1 className="editorial mt-4 text-4xl leading-tight md:text-5xl">{mode === "sign-up" ? "Confirm your account." : screens[mode].title}</h1><p className="mt-5 leading-relaxed text-[var(--muted)]">{mode === "sign-up" ? "Request a fresh confirmation link to finish setting up your account." : screens[mode].intro}</p></>}
    {error && <p role="alert" className="form-error mt-6">{mode === "sign-up" ? "This confirmation link is invalid or has expired. Enter your email to request a new link." : "This reset link is invalid or has expired. Request a new password reset link."}</p>}
    {demo === "unavailable" && <p role="alert" className="form-error mt-6">The local demo account is unavailable. Run <code>npm run local:demo-account</code>, then try again.</p>}
    {mode === "sign-up" && error === "expired" ? <ExpiredConfirmationForm /> : <AuthForm mode={mode} development={process.env.NODE_ENV !== "production"} />}
    <nav aria-label="Account options" className="mt-8 flex flex-col gap-5 text-center text-sm">
      {mode !== "sign-in" && mode !== "sign-up" && <Link className="text-link" href="/account/sign-in">Already have an account? Sign in</Link>}
      {mode === "sign-in" && <><Link className="text-link" href="/account/recovery">Forgot your password?</Link><Link className="text-link" href="/account/sign-up">New here? Create an account</Link></>}
    </nav>
  </AccountShell>;
}
