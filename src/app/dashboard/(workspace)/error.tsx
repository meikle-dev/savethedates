"use client";

// Keeps the workspace header and section navigation available when one section fails to load.
export default function SectionError({ reset }: { reset: () => void }) {
  return <div className="ws-page">
    <header className="ws-page-head">
      <p className="eyebrow">Your wedding workspace</p>
      <h1>This section is unavailable.</h1>
      <p>We couldn’t load it just now. Your saved details are unchanged; please try again in a moment.</p>
    </header>
    <button onClick={reset} className="primary-button">Try again</button>
  </div>;
}
