import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/account/actions";
import { DraftForm } from "@/features/workspace/draft-form";
import { draftSchema } from "@/features/workspace/validation";
import { PublicationForm } from "@/features/workspace/publication-form";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ signout?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, wedding_date, location, message, slug, published, first_published_at, photo_path").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load wedding workspace.");
  const draft = data ? draftSchema.parse(data) : { first_name: "", second_name: "", wedding_date: "", location: "", message: "" };
  const params = await searchParams;
  return <div className="platform min-h-svh">
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-7 md:px-10">
      <Link href="/" className="brand">SaveTheDates<span aria-hidden="true">.</span></Link>
      <form action={signOut}><button className="text-link min-h-11 px-2 text-sm">Sign out</button></form>
    </header>
    <main className="mx-auto max-w-4xl px-6 pt-8 pb-20 md:pt-14">
      <div className="flex flex-wrap items-center gap-3"><p className="eyebrow">Your wedding workspace</p><span aria-live="polite" className="draft-badge">{data?.published ? "Published" : "Private draft"}</span></div>
      <h1 className="editorial mt-5 text-4xl leading-tight md:text-6xl">Start with your story.</h1>
      <p className="mt-5 max-w-xl leading-relaxed text-[var(--muted)]">A few details, a date to remember. Save your first chapter here and come back whenever you like.</p>
      {params.signout && <p role="alert" className="form-error mt-5">We couldn’t sign you out. Please try again.</p>}
      <section aria-labelledby="draft-title" className="mt-10 border-t border-[var(--line)] pt-8">
        <h2 id="draft-title" className="text-xl font-medium">The two of you</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{data?.published ? "Your site is public. Saving details or changing your photo updates it immediately." : "Only you can access this draft. It isn’t shared with guests."}</p>
        <DraftForm initial={draft} published={!!data?.published} />
      </section>
      {data ? <PublicationForm slug={data.slug} published={data.published} photo={!!data.photo_path} locked={!!data.first_published_at} /> : <aside className="mt-12 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold">What comes next?</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">Save your details to add a photo, preview your site and choose a URL to share.</p>
      </aside>}
    </main>
  </div>;
}
