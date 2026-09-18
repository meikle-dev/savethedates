import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/account/recovery?error=expired";
  if (hash && (type === "signup" || type === "recovery")) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error) destination = type === "recovery" ? "/account/password" : "/dashboard";
  }
  const response = NextResponse.redirect(new URL(destination, appOrigin()));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
