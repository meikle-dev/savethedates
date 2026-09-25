"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
import { emailSchema, passwordSchema, type FormState } from "./validation";

const localDemoAccount = {
  email: "local-demo@example.test",
  password: "SaveTheDatesLocal123!",
} as const;

function localDevelopmentOnly() {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const hostname = new URL(process.env.SUPABASE_URL ?? "").hostname;
    return ["127.0.0.1", "localhost", "host.docker.internal"].includes(hostname);
  } catch { return false; }
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  return withLogging("account.signin", "/account/[screen]", async () => {
    const input = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).safeParse(Object.fromEntries(form));
    if (!input.success) return { errors: input.error.flatten().fieldErrors };
    try {
      const client = await createClient();
      const { error } = await client.auth.signInWithPassword(input.data);
      if (error) {
        log.warn("account.signin.rejected", { reason: errorReason(error) });
        return { message: "We couldn’t sign you in. Check your email and password, and confirm your email before signing in." };
      }
    } catch (error) {
      log.error("account.signin.failed", { reason: errorReason(error) });
      return { message: "Sign-in is temporarily unavailable. Please try again." };
    }
    redirect("/dashboard");
  });
}

export async function signInDemo(form: FormData): Promise<void> {
  void form;
  if (!localDevelopmentOnly()) redirect("/account/sign-in?demo=unavailable");
  try {
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword(localDemoAccount);
    if (error) redirect("/account/sign-in?demo=unavailable");
  } catch { redirect("/account/sign-in?demo=unavailable"); }
  redirect("/dashboard");
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  return withLogging("account.signup", "/account/[screen]", async () => {
    const input = z.object({ email: emailSchema, password: passwordSchema }).safeParse(Object.fromEntries(form));
    if (!input.success) return { errors: input.error.flatten().fieldErrors };
    try {
      const client = await createClient();
      const { error } = await client.auth.signUp({ ...input.data, options: { emailRedirectTo: `${appOrigin()}/auth/confirm` } });
      if (error && error.code !== "user_already_exists") {
        log.error("account.signup.failed", { reason: errorReason(error) });
        return { message: "We couldn’t send a confirmation email. Please wait a moment and try again." };
      }
      // An existing email is reported as a normal request so the response does not reveal registered accounts.
      log.info("account.signup.requested");
      return { success: true, message: "Check your email to confirm your account. If you already have an account, sign in or reset your password." };
    } catch (error) {
      log.error("account.signup.failed", { reason: errorReason(error) });
      return { message: "Account creation is temporarily unavailable. Please try again." };
    }
  });
}

export async function requestRecovery(_: FormState, form: FormData): Promise<FormState> {
  return withLogging("account.recovery", "/account/[screen]", async () => {
    const input = emailSchema.safeParse(form.get("email"));
    if (!input.success) return { errors: { email: ["Enter a valid email address."] } };
    try {
      const client = await createClient();
      const { error } = await client.auth.resetPasswordForEmail(input.data, { redirectTo: `${appOrigin()}/auth/confirm` });
      if (error) {
        log.error("account.recovery.failed", { reason: errorReason(error) });
        return { message: "We couldn’t process that request. Please wait a moment and try again." };
      }
      log.info("account.recovery.requested");
      return { success: true, message: "If an account uses that email, a password reset link is on its way. Check your inbox." };
    } catch (error) {
      log.error("account.recovery.failed", { reason: errorReason(error) });
      return { message: "Password recovery is temporarily unavailable. Please try again." };
    }
  });
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  return withLogging("account.password", "/account/[screen]", async () => {
    const input = passwordSchema.safeParse(form.get("password"));
    if (!input.success) return { errors: { password: input.error.issues.map((issue) => issue.message) } };
    try {
      const client = await createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        log.warn("account.password.rejected", { reason: "no_session" });
        return { message: "Your link has expired. Request a new password reset email." };
      }
      identify({ ownerId: user.id });
      const { error } = await client.auth.updateUser({ password: input.data });
      if (error) {
        log.warn("account.password.rejected", { reason: errorReason(error) });
        return { message: "We couldn’t change your password. Use a different password or request a new reset link." };
      }
      log.info("account.password.updated");
      return { success: true, message: "Your password has been changed. You can return to your wedding workspace." };
    } catch (error) {
      log.error("account.password.failed", { reason: errorReason(error) });
      return { message: "We couldn’t change your password. Please try again." };
    }
  });
}

export async function signOut(): Promise<FormState> {
  return withLogging("account.signout", "/dashboard", async () => {
    const client = await createClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) {
      log.error("account.signout.failed", { reason: errorReason(error) });
      return { message: "We couldn’t sign you out. Please try again." };
    }
    redirect("/account/sign-in");
  });
}
