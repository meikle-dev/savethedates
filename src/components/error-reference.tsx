// The digest links what the user sees to the server log line and the Sentry event (tag error_reference).
export function ErrorReference({ digest }: { digest?: string }) {
  if (!digest) return null;
  return <p className="mt-3 text-sm text-[var(--muted)]">Error reference: <code>{digest}</code></p>;
}
