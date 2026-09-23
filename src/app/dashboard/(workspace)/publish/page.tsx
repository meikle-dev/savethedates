import type { Metadata } from "next";
import { PublicationForm } from "@/features/workspace/publication-form";
import { requireWedding } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Publish · SaveTheDates" };

export default async function Publish({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const [{ wedding, entitlement, live }, params] = await Promise.all([requireWedding(), searchParams]);
  return <WorkspacePage id="share-title" eyebrow="Publish" title="Share your site" intro={live ? "Your site is live for anyone with its URL." : "Your site is private until you publish it."}>
    <div className="ws-panel">
      <PublicationForm slug={wedding.slug} published={live} locked={!!wedding.first_published_at} entitlement={entitlement} checkout={params.checkout} />
    </div>
  </WorkspacePage>;
}
