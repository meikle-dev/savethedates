import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-8 py-16">
      <p className="text-xs tracking-[0.2em] uppercase text-[var(--sage)]">SaveTheDates</p>
      <h1 className="editorial mt-5 text-5xl leading-tight">Something lovely<br />is on its way.</h1>
      <Link className="mt-8 w-fit border-b border-[var(--sage)] pb-1 text-[var(--sage)]" href="/account/sign-up">Create your private wedding draft</Link>
      <Link className="mt-4 w-fit underline underline-offset-4 text-[var(--sage)]" href="/account/sign-in">Sign in</Link>
      {process.env.NODE_ENV === "development" ? (
        <>
          <p className="mt-6 leading-relaxed">A local preview of our first wedding theme. All names and event details are fictional.</p>
          <Link className="mt-8 w-fit border-b border-[var(--sage)] pb-1 text-[var(--sage)]" href="/demo">Open the Save the Date preview <span aria-hidden="true">→</span></Link>
        </>
      ) : <p className="mt-6 leading-relaxed">Our wedding website service is in development.</p>}
    </main>
  );
}
