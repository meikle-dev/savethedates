import Link from "next/link";

export const legalPaths = { privacy: "/privacy", terms: "/terms", refunds: "/refunds" } as const;

/** Shown beside sign-up and checkout, where people agree to the terms. */
export function LegalAgreement({ action }: { action: string }) {
  return <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">By {action} you agree to our <Link className="text-link" href={legalPaths.terms}>terms</Link> and <Link className="text-link" href={legalPaths.refunds}>refund policy</Link>, and confirm you have read our <Link className="text-link" href={legalPaths.privacy}>privacy notice</Link>.</p>;
}
