"use client";

import { useState } from "react";

export function CopyLinkButton({ href, label, className, failure, children }: { href: string; label: string; className: string; failure: string; children?: React.ReactNode }) {
  const [result, setResult] = useState<"copied" | "failed" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setResult("copied");
    } catch {
      setResult("failed");
    }
  }

  return <>
    <button type="button" className={className} onClick={copy}>{children}{label}</button>
    {result === "copied" && <p className="field-help" role="status">Link copied.</p>}
    {result === "failed" && <p className="field-error" role="alert">{failure}</p>}
  </>;
}
