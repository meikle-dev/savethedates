import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SaveTheDate } from "@/features/weddings/save-the-date";
import { toWedding } from "@/features/weddings/published";

export default async function Preview() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, wedding_date, location, message, photo_path").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load preview.");
  if (!data) redirect("/dashboard");
  return <><nav aria-label="Preview" className="platform flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm"><span>Private preview · saved content</span><Link href="/dashboard" className="text-link min-h-11 content-center">Back to workspace</Link></nav><SaveTheDate wedding={toWedding(data, "/dashboard/photo")} /></>;
}
