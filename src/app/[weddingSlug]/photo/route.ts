import { publicClient } from "@/lib/supabase/public";
import { publishedWedding } from "@/features/weddings/published";
import { missingPhoto, photoResponse } from "@/features/weddings/photo-response";

export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ weddingSlug: string }> }) {
  const { weddingSlug } = await params;
  const data = await publishedWedding(weddingSlug);
  if (!data) return missingPhoto();
  return photoResponse(publicClient(), data.photo_path);
}
