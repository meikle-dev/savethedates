"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
import { emailSchema, passwordSchema, type FormState } from "./validation";

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const input = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { errors: input.error.flatten().fieldErrors };
  try {
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword(input.data);
    if (error) return { message: "We couldn’t sign you in. Check your email and password, and confirm your email before signing in." };
  } catch { return { message: "Sign-in is temporarily unavailable. Please try again." }; }
  redirect("/dashboard");
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const input = z.object({ email: emailSchema, password: passwordSchema }).safeParse(Object.fromEntries(form));
  if (!input.success) return { errors: input.error.flatten().fieldErrors };
  try {
    const client = await createClient();
    const { error } = await client.auth.signUp({ ...input.data, options: { emailRedirectTo: `${appOrigin()}/auth/confirm` } });
    if (error && error.code !== "user_already_exists") return { message: "We couldn’t send a confirmation email. Please wait a moment and try again." };
    return { success: true, message: "Check your email to confirm your account. If you already have an account, sign in or reset your password." };
  } catch { return { message: "Account creation is temporarily unavailable. Please try again." }; }
}

export async function requestRecovery(_: FormState, form: FormData): Promise<FormState> {
  const input = emailSchema.safeParse(form.get("email"));
  if (!input.success) return { errors: { email: ["Enter a valid email address."] } };
  try {
    const client = await createClient();
    const { error } = await client.auth.resetPasswordForEmail(input.data, { redirectTo: `${appOrigin()}/auth/confirm` });
    if (error) return { message: "We couldn’t process that request. Please wait a moment and try again." };
    return { success: true, message: "If an account uses that email, a password reset link is on its way. Check your inbox." };
  } catch { return { message: "Password recovery is temporarily unavailable. Please try again." }; }
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const input = passwordSchema.safeParse(form.get("password"));
  if (!input.success) return { errors: { password: input.error.issues.map((issue) => issue.message) } };
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { message: "Your link has expired. Request a new password reset email." };
    const { error } = await client.auth.updateUser({ password: input.data });
    if (error) return { message: "We couldn’t change your password. Use a different password or request a new reset link." };
    return { success: true, message: "Your password has been changed. You can return to your wedding workspace." };
  } catch { return { message: "We couldn’t change your password. Please try again." }; }
}

export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) redirect("/dashboard?signout=failed");
  redirect("/account/sign-in");
}
