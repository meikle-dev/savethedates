import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";

// auth-js also writes per-flow verifier cookies but, on the server, reads and clears only the fixed one.
const flowVerifierCookie = /^wedding-auth-(flow-[0-9a-f]+-|flows-)code-verifier$/;

async function exchange(code: string) {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      identify({ ownerId: data.user?.id });
      log.info("account.google_callback.succeeded");
      return true;
    }
    if (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500) log.error("account.google_callback.failed", { reason: errorReason(error) });
    else log.warn("account.google_callback.rejected", { reason: errorReason(error) });
  } catch (error) {
    log.error("account.google_callback.failed", { reason: errorReason(error) });
  }
  return false;
}

// Supabase returns here from Google with either a single-use code or an error. Every outcome is a
// generic redirect, so the response never reveals whether an email already has an account.
export async function GET(request: NextRequest) {
  return withLogging("account.google_callback", "/auth/callback", async () => {
    const params = request.nextUrl.searchParams;
    const providerError = params.get("error");
    const code = params.get("code");
    let destination = "/account/sign-in?google=failed";
    if (providerError) {
      log.warn("account.google_callback.rejected", { reason: providerError });
      if (providerError === "access_denied") destination = "/account/sign-in?google=cancelled";
    } else if (code) {
      if (await exchange(code)) destination = "/dashboard";
    } else {
      log.warn("account.google_callback.rejected", { reason: "malformed_callback" });
    }
    const store = await cookies();
    store.getAll().filter(({ name }) => flowVerifierCookie.test(name)).forEach(({ name }) => store.delete(name));
    const response = NextResponse.redirect(new URL(destination, appOrigin()));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  });
}
