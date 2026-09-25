"use client";

import { useEffect } from "react";
import { ErrorReference } from "@/components/error-reference";
import { captureClientError } from "@/lib/monitoring/browser";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => captureClientError(error), [error]);
  return <main className="platform mx-auto min-h-svh max-w-lg px-6 py-20"><h1 className="editorial text-4xl">Your workspace is unavailable.</h1><p className="mt-5 leading-relaxed">We couldn’t load your draft. Please try again in a moment.</p><ErrorReference digest={error.digest} /><button onClick={reset} className="button button-primary mt-8">Try again</button></main>;
}
