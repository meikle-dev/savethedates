"use client";

import { useActionState } from "react";
import { signOut } from "./actions";
import type { FormState } from "./validation";

export function SignOutButton({ className }: { className: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signOut, {});
  return <form action={action} className="relative">
    <button className={className} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>
    {state.message && <p role="alert" className="form-error absolute right-0 top-full z-30 mt-2 w-64">{state.message}</p>}
  </form>;
}
