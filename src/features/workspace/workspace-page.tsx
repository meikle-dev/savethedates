// Shared heading for each workspace section; the section is a named region for assistive technology.
export function WorkspacePage({ id, eyebrow, title, intro, wide = false, children }: { id: string; eyebrow: string; title: string; intro: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return <section aria-labelledby={id} className={wide ? undefined : "ws-page"}>
    <header className="ws-page-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={id}>{title}</h1>
      <p>{intro}</p>
    </header>
    {children}
  </section>;
}
