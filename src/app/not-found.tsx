import Link from "next/link";

export default function NotFound() {
  return <main className="platform flex min-h-svh items-center px-6 py-16 sm:px-8"><div className="mx-auto w-full max-w-xl rounded-2xl border border-[var(--line)] bg-[#fffdf9] px-7 py-12 shadow-sm sm:px-12 sm:py-16"><Link href="/" className="brand inline-block" aria-label="SaveTheDates home">Save<span>The</span>Dates</Link><p className="eyebrow mt-12">404 · This page is unavailable</p><h1 className="editorial mt-4 text-4xl leading-tight sm:text-5xl">Page not found</h1><p className="mt-5 leading-relaxed text-[var(--muted)]">We couldn’t find this page. Check the address you were given, or return to SaveTheDates.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/" className="button button-primary">Go to home</Link><Link href="/account/sign-in" className="button button-secondary">Sign in</Link></div></div></main>;
}
