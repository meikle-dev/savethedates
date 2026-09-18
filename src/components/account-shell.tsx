import Link from "next/link";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return <div className="platform min-h-svh">
    <header className="mx-auto max-w-6xl px-6 py-7 md:px-10"><Link href="/" className="brand">SaveTheDates<span aria-hidden="true">.</span></Link></header>
    <main className="mx-auto max-w-lg px-6 pt-8 pb-20 md:pt-16">{children}</main>
  </div>;
}
