import "server-only";
import { notFound } from "next/navigation";
import { getDevelopmentWedding, type DevelopmentFixture } from "./preview";
import { SaveTheDate } from "./save-the-date";

/** Fictional development-only announcement at /demo and its variants. Production returns 404. */
export function DevelopmentWeddingPage({ fixture }: { fixture: DevelopmentFixture }) {
  const wedding = getDevelopmentWedding(fixture);
  if (!wedding) notFound();
  return <SaveTheDate wedding={wedding} homeHref={`/${fixture}`} />;
}
