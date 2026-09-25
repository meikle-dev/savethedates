import { identify, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { missingPhoto, photoResponse } from "@/features/weddings/photo-response";

export const dynamic = "force-dynamic";
export async function GET() {
  return withLogging("photo.read", "/dashboard/photo", async () => {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return missingPhoto();
    identify({ ownerId: user.id });
    const { data } = await client.from("weddings").select("photo_path").eq("owner_id", user.id).maybeSingle();
    return photoResponse(client, data?.photo_path ?? null);
  });
}
