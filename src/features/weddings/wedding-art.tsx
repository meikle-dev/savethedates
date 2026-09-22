/** Public decorative SVG selected by the enclosing theme; never guest content. */
export function BotanicalArt({ className = "" }: { className?: string }) {
  return <span className={`botanical-art ${className}`} aria-hidden="true" />;
}

export type WeddingIconKind = "ceremony" | "reception" | "travel" | "accommodation" | "dress" | "questions";
export function WeddingIcon({ kind }: { kind: WeddingIconKind }) {
  const paths: Record<WeddingIconKind, React.ReactNode> = {
    ceremony: <><circle cx="12" cy="19" r="7" /><circle cx="23" cy="19" r="7" /><path d="m11 9 2-4 3 4-3 4Zm11 0 2-4 3 4-3 4Z" /></>,
    reception: <><path d="m6 5 9 2-2 8a5 5 0 0 1-9-2Zm3 14-2 9m-4-1 8 2M26 5l-9 2 2 8a5 5 0 0 0 9-2Zm-3 14 2 9m4-1-8 2M5 11l9 2m4 0 9-2" /></>,
    travel: <><rect x="4" y="5" width="26" height="21" rx="4" /><path d="M4 15h26M12 5v10M22 5v10M8 20h3m13 0h3M8 26v3m18-3v3" /></>,
    accommodation: <><path d="m3 16 14-12 14 12M7 13v17h20V13M14 30V20h6v10M23 5h4v8" /></>,
    dress: <><path d="M14 9a3 3 0 1 1 6 0c0 3-3 3-3 6v2L4 26c-2 1-1 3 1 3h24c2 0 3-2 1-3l-13-9" /></>,
    questions: <><path d="M20 23a11 11 0 1 0-9 1l-5 5 10-4M25 13a8 8 0 0 1 3 14l1 4-6-3h-4" /></>,
  };
  return <span className="wedding-icon" aria-hidden="true"><svg viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg></span>;
}
