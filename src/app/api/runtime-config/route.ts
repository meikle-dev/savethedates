import { sentryConfig } from "@/lib/monitoring/config";

// Browser configuration read at request time, so a prebuilt image (including static pages) uses this
// environment's values. The Sentry DSN is designed to be public; no secrets are returned.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ sentry: sentryConfig() }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
