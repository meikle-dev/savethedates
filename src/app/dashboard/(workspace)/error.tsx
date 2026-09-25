"use client";

import { useEffect } from "react";
import { ErrorReference } from "@/components/error-reference";
import { captureClientError } from "@/lib/monitoring/browser";

// Keeps the workspace header and section navigation available when one section fails to load.
export default function SectionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => captureClientError(error), [error]);
  return <div className="ws-page">
    <header className="ws-page-head">
      <p className="eyebrow">Your wedding workspace</p>
      <h1>This section is unavailable.</h1>
      <p>We couldn’t load it just now. Your saved details are unchanged; please try again in a moment.</p>
      <ErrorReference digest={error.digest} />
    </header>
    <button onClick={reset} className="button button-primary">Try again</button>
  </div>;
}
