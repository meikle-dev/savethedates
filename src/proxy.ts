import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  // Always replaced, never trusted from the client: it links log lines, Sentry events and error references.
  const requestId = crypto.randomUUID();
  request.headers.set("x-request-id", requestId);
  let response = NextResponse.next({ request });
  const refreshAuth = request.nextUrl.pathname === "/" || ["/dashboard", "/account", "/auth"].some((prefix) => request.nextUrl.pathname.startsWith(`${prefix}/`) || request.nextUrl.pathname === prefix);
  if (refreshAuth && process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    const { url, key } = supabaseConfig();
    const supabase = createServerClient(url, key, {
      cookieOptions: { name: "wedding-auth", httpOnly: true, sameSite: "lax", secure: process.env.APP_ORIGIN?.startsWith("https://") },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (updates, headers) => {
          updates.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          updates.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    });
    await supabase.auth.getUser();
  }
  const privateGuestLink = request.nextUrl.searchParams.has("share") || /^\/s\/[A-Za-z0-9_-]{43}\/[^/]+\/rsvp$/.test(request.nextUrl.pathname);
  if (refreshAuth || privateGuestLink) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  if (privateGuestLink) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Request-Id", requestId);
  return response;
}

// Every request except Next.js build assets, so no application code can see a client-supplied x-request-id.
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
