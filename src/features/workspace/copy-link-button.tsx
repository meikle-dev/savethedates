"use client";

import { useState } from "react";

/** Copies exactly the given text (an absolute link or message built from APP_ORIGIN), never resolving it against the page's host. */
export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function CopyLinkButton({ value, label, className, failure, children }: { value: string; label: string; className: string; failure: string; children?: React.ReactNode }) {
  const [result, setResult] = useState<"copied" | "failed" | null>(null);

  async function copy() {
    setResult(null);
    setResult(await copyText(value) ? "copied" : "failed");
  }

  return <>
    <button type="button" className={className} onClick={copy}>{children}{label}</button>
    {result === "copied" && <p className="field-help" role="status">Link copied.</p>}
    {result === "failed" && <p className="field-error" role="alert">{failure}</p>}
  </>;
}
