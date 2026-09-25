"use server";

import { revalidatePath } from "next/cache";
import { guestPagesRoute } from "@/features/weddings/guest-link";
import { z } from "zod";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { parsePhotoFraming, photoFrameSchema, setPhotoFrame, type PhotoFrame, type PhotoPage } from "@/features/weddings/photo-framing";
import { isWeddingTheme, type WeddingTheme } from "@/features/weddings/themes";

export type PhotoFramingFormState = {
  success?: boolean;
  message?: string;
  page?: PhotoPage;
  frame?: PhotoFrame;
};

const submittedFrameSchema = z.object({
  x: z.string().trim().min(1).pipe(z.coerce.number()),
  y: z.string().trim().min(1).pipe(z.coerce.number()),
  zoom: z.string().trim().min(1).pipe(z.coerce.number()),
}).pipe(photoFrameSchema);

export async function savePhotoFraming(_: PhotoFramingFormState, form: FormData): Promise<PhotoFramingFormState> {
  return withLogging("workspace.save", "/dashboard/design", async () => {
    const page = form.get("page");
    const theme = form.get("theme");
    const frame = submittedFrameSchema.safeParse({ x: form.get("x"), y: form.get("y"), zoom: form.get("zoom") });
    if ((page !== "saveTheDate" && page !== "details") || !isWeddingTheme(theme) || !frame.success) {
      return { message: "That framing is outside the supported crop area. Reset it and try again." };
    }

    try {
      const client = await createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        log.warn("workspace.ownership.denied", { reason: "no_session" });
        return { message: "Your session has ended. Sign in again, then retry." };
      }
      identify({ ownerId: user.id });
      const { data: wedding, error } = await client.from("weddings")
        .select("id, published, photo_path, photo_framing, theme")
        .eq("owner_id", user.id)
        .single();
      if (error || !wedding) {
        log.warn("workspace.ownership.denied", { reason: "no_wedding" });
        return { message: "Save your wedding details first, then retry." };
      }
      identify({ weddingId: wedding.id });
      if (!wedding.photo_path) return { message: "Add a photo before saving its framing." };
      if (wedding.theme !== theme) {
        log.warn("workspace.save.rejected", { section: "photo_framing", reason: "theme_changed" });
        return { message: "Your applied theme changed. Reload before saving its framing." };
      }

      const rounded: PhotoFrame = {
        x: Math.round(frame.data.x * 100) / 100,
        y: Math.round(frame.data.y * 100) / 100,
        zoom: Math.round(frame.data.zoom * 100) / 100,
      };
      const next = setPhotoFrame(parsePhotoFraming(wedding.photo_framing), theme as WeddingTheme, page, rounded);
      const { data: updated, error: updateError } = await client.from("weddings")
        .update({ photo_framing: next })
        .eq("id", wedding.id)
        .eq("photo_path", wedding.photo_path)
        .eq("theme", wedding.theme)
        .eq("photo_framing", JSON.stringify(wedding.photo_framing))
        .select("id");
      if (!updateError && !updated?.length) {
        log.warn("workspace.save.rejected", { section: "photo_framing", reason: "concurrent_change" });
        return { message: "Your photo, theme, or framing changed in another request. Reload and try again." };
      }
      if (updateError) {
        log.error("workspace.save.failed", { section: "photo_framing", reason: errorReason(updateError) });
        return { message: "Could not save framing. Your saved crop is unchanged; please retry." };
      }

      revalidatePath("/dashboard", "layout");
      revalidatePath(guestPagesRoute, "layout");
      log.info("workspace.save.succeeded", { section: "photo_framing" });
      return {
        success: true,
        message: wedding.published ? "Framing saved and updated on your live site." : "Photo framing saved.",
        page,
        frame: rounded,
      };
    } catch (error) {
      log.error("workspace.save.failed", { section: "photo_framing", reason: errorReason(error) });
      return { message: "Could not save framing. Check your connection and sign-in, then retry." };
    }
  });
}
