import type { Metadata } from "next";
import { detailsSchema } from "@/features/weddings/details";
import { DetailsForm } from "@/features/workspace/details-form";
import { requireWedding } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Details · SaveTheDates" };

export default async function Details() {
  const { wedding, live } = await requireWedding();
  return <WorkspacePage id="details-title" eyebrow="Details" title="Wedding Details" intro="Share only the practical information your guests need. Empty sections won’t appear.">
    <div className="ws-panel"><DetailsForm initial={detailsSchema.parse(wedding)} published={live} /></div>
  </WorkspacePage>;
}
