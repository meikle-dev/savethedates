"use client";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <main className="platform mx-auto min-h-svh max-w-lg px-6 py-20"><h1 className="editorial text-4xl">Your workspace is unavailable.</h1><p className="mt-5 leading-relaxed">We couldn’t load your draft. Please try again in a moment.</p><button onClick={reset} className="button button-primary mt-8">Try again</button></main>;
}
