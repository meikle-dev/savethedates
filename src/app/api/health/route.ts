// Liveness probe for the host's health check. It deliberately tests nothing else, so a database, email or billing
// outage never restarts a working server. Open without the staging password (src/lib/staging-access.ts).
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
