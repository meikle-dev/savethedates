import { withLogging } from "@/lib/logger";
import { publicClient } from "@/lib/supabase/public";
import { guestWedding } from "@/features/weddings/published";
import { missingPhoto, photoResponse } from "@/features/weddings/photo-response";

export const dynamic = "force-dynamic";
// Looked up by secret only, like the pages. The names part is not checked: pages always link the current one.
export async function GET(_: Request, { params }: { params: Promise<{ names: string; secret: string }> }) {
  return withLogging("photo.read", "/[names]/[secret]/photo", async () => {
    const { secret } = await params;
    const data = await guestWedding(secret);
    if (!data) return missingPhoto();
    return photoResponse(publicClient(), data.photo_path);
  });
}
