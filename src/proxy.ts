import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
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
  if (refreshAuth || request.nextUrl.searchParams.has("invite")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  if (request.nextUrl.searchParams.has("invite")) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/", "/dashboard/:path*", "/account/:path*", "/auth/:path*", "/:weddingSlug", "/:weddingSlug/details", "/:weddingSlug/rsvp"] };
