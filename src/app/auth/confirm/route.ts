import { NextResponse, type NextRequest } from "next/server";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  return withLogging("account.confirm", "/auth/confirm", async () => {
    const hash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");
    let destination = type === "signup" ? "/account/sign-up?error=expired" : "/account/recovery?error=expired";
    if (hash && (type === "signup" || type === "recovery")) {
      const client = await createClient();
      const { data, error } = await client.auth.verifyOtp({ token_hash: hash, type });
      if (!error) {
        identify({ ownerId: data.user?.id });
        log.info("account.confirm.succeeded", { eventType: type });
        destination = type === "recovery" ? "/account/password" : "/dashboard";
      } else {
        log.warn("account.confirm.rejected", { eventType: type, reason: errorReason(error) });
      }
    } else {
      log.warn("account.confirm.rejected", { reason: "malformed_link" });
    }
    const response = NextResponse.redirect(new URL(destination, appOrigin()));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  });
}
