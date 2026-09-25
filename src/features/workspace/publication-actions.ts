"use server";

import { revalidatePath } from "next/cache";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/features/account/validation";
import { guestPagesRoute } from "@/features/weddings/guest-link";
import { slugError, slugSchema } from "./publication-validation";
import { PhotoRejectedError, preparePhoto } from "./photo";
import { denyWorkspace, WorkspaceAccessError } from "./workspace-access";

export type PhotoFormState = FormState & {
  photoPresent?: boolean;
  photoRevision?: string;
};

async function workspace() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) denyWorkspace("no_session", "Your session has ended. Sign in again, then retry.");
  identify({ ownerId: user.id });
  const { data, error } = await client.from("weddings").select("id, photo_path, published").eq("owner_id", user.id).single();
  if (error || !data) denyWorkspace("no_wedding", "Save your wedding details first, then retry.");
  identify({ weddingId: data.id });
  return { client, wedding: data };
}
function refresh() {
  revalidatePath("/dashboard", "layout");
  revalidatePath(guestPagesRoute, "layout");
}
/** Saves the names part of the guest link. Allowed before payment and after publishing; it is not unique. */
export async function saveGuestLinkNames(_: FormState, form: FormData): Promise<FormState> {
  return withLogging("workspace.save", "/dashboard/publish", async () => {
    const slug = slugSchema.safeParse(form.get("slug"));
    if (!slug.success) return { message: "Check the names in your guest link.", errors: { slug: slugError(slug) } };
    try {
      const { client, wedding } = await workspace();
      const { error } = await client.from("weddings").update({ slug: slug.data }).eq("id", wedding.id);
      if (error) {
        log.error("workspace.save.failed", { section: "guest_link", reason: errorReason(error) });
        return { message: "We couldn’t save your guest link. Please retry." };
      }
      refresh();
      log.info("workspace.save.succeeded", { section: "guest_link" });
      return { success: true, message: wedding.published ? "Your guest link is updated. Links you already shared still work." : "Your guest link names are saved." };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("workspace.save.failed", { section: "guest_link", reason: errorReason(error) });
      return { message: error instanceof Error ? error.message : "We couldn’t save your guest link. Please retry." };
    }
  });
}
export async function publishWedding(_: FormState, form: FormData): Promise<FormState> {
  return withLogging("publication.publish", "/dashboard/publish", async () => {
    try {
      const slug = slugSchema.safeParse(form.get("slug"));
      const consent = form.get("visibility") === "on";
      // Both problems are reported together, next to their fields.
      if (!slug.success || !consent) return { message: "Check the highlighted fields.", errors: {
        slug: slugError(slug),
        visibility: consent ? undefined : ["Confirm that anyone with your guest link can view your site."],
      } };
      const { client, wedding } = await workspace();
      const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
      if (!entitlement?.active) {
        log.warn("publication.publish.blocked", { reason: "no_entitlement" });
        return { message: "Purchase this wedding site before publishing." };
      }
      const { error } = await client.from("weddings").update({ slug: slug.data, published: true }).eq("id", wedding.id);
      if (error) {
        log.error("publication.publish.failed", { reason: errorReason(error) });
        return { message: "We couldn’t publish. Please retry." };
      }
      refresh();
      log.info("publication.publish.succeeded");
      return { success: true, message: "Your wedding site is published and ready to share." };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("publication.publish.failed", { reason: errorReason(error) });
      return { message: error instanceof Error ? error.message : "Unable to publish. Please retry." };
    }
  });
}
export async function unpublishWedding(): Promise<FormState> {
  return withLogging("publication.unpublish", "/dashboard/publish", async () => {
    try {
      const { client, wedding } = await workspace();
      const { error } = await client.from("weddings").update({ published: false }).eq("id", wedding.id);
      if (error) {
        log.error("publication.unpublish.failed", { reason: errorReason(error) });
        return { message: "We couldn’t unpublish. Please retry." };
      }
      refresh();
      log.info("publication.unpublish.succeeded");
      return { success: true, message: "Your site is now private. Previously downloaded copies cannot be recalled." };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("publication.unpublish.failed", { reason: errorReason(error) });
      return { message: "We couldn’t unpublish. Check your connection and sign-in, then retry." };
    }
  });
}
export async function changePhoto(_: PhotoFormState, form: FormData): Promise<PhotoFormState> {
  return withLogging("photo.upload", "/dashboard/design", async () => {
    try {
      const { client, wedding } = await workspace();
      let path: string | null = null;
      if (form.get("intent") !== "remove") {
        const file = form.get("photo");
        if (!(file instanceof File)) return { message: "Choose a photo first." };
        let photo: Buffer;
        const started = Date.now();
        try { photo = await preparePhoto(file); }
        catch (error) {
          if (error instanceof PhotoRejectedError) log.warn("photo.upload.rejected", { reason: error.reason });
          else log.error("photo.upload.failed", { reason: errorReason(error) });
          return { message: (error as Error).message };
        }
        const processingMs = Date.now() - started;
        path = `${wedding.id}/${crypto.randomUUID()}.webp`;
        const { error } = await client.storage.from("wedding-photos").upload(path, photo, { contentType: "image/webp", cacheControl: "0", upsert: false });
        if (error) {
          log.error("photo.upload.failed", { reason: errorReason(error) });
          return { message: "We couldn’t upload your photo. Your previous photo is unchanged; please retry." };
        }
        log.info("photo.upload.accepted", { durationMs: processingMs });
      }
      // Compare-and-swap prevents concurrent replacements from deleting the winning photo.
      let update = client.from("weddings").update({ photo_path: path, photo_framing: {} }).eq("id", wedding.id);
      update = wedding.photo_path ? update.eq("photo_path", wedding.photo_path) : update.is("photo_path", null);
      const { data, error } = await update.select("id");
      if (error || !data?.length) {
        if (path) await client.storage.from("wedding-photos").remove([path]);
        if (error) log.error("photo.upload.failed", { reason: errorReason(error) });
        else log.warn("photo.upload.rejected", { reason: "concurrent_change" });
        return { message: "Your photo changed in another request or couldn’t be saved. Reload and retry." };
      }
      if (wedding.photo_path) await client.storage.from("wedding-photos").remove([wedding.photo_path]);
      refresh();
      return {
        success: true,
        message: path ? "Your photo has been saved." : "Your photo has been removed.",
        photoPresent: !!path,
        photoRevision: path ? crypto.randomUUID() : undefined,
      };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("photo.upload.failed", { reason: errorReason(error) });
      return { message: "We couldn’t save your photo. Check your connection and sign-in, then retry." };
    }
  });
}
