import type { ReactNode } from "react";
import type { WeddingTheme } from "./themes";
import { WeddingNavigation } from "./wedding-navigation";
import { BotanicalArt } from "./wedding-art";
import { weddingFontClasses } from "./wedding-fonts";

export function WeddingFrame({ theme = "minimal", className = "", children }: { theme?: WeddingTheme; className?: string; children: ReactNode }) {
  return <div data-theme={theme} className={`${weddingFontClasses(theme)} wedding-shell ${className}`}>{children}</div>;
}

export function WeddingHeader({ names, ...navigation }: { names: readonly [string, string] } & Parameters<typeof WeddingNavigation>[0]) {
  return <header className="wedding-header">
    <p className="couple-names"><span>{names[0]}</span><span className="couple-ampersand">&amp;</span><span>{names[1]}</span></p>
    <WeddingNavigation {...navigation} />
    <span className="header-flourish" aria-hidden="true">Together is<br />a beautiful place</span>
  </header>;
}

/** F076: where the "Made with SaveTheDates" credit is shown. Published guest pages pass "guest-site". */
export type CreditSource = "guest-site" | "example" | "preview";
export type WeddingPageType = "save-the-date" | "invitation" | "details" | "rsvp";

/** The credit links home with campaign tags only: never the guest link, secret, names or theme. */
export function creditHref(source: CreditSource, page: WeddingPageType) {
  return `/?${new URLSearchParams({ utm_source: source, utm_medium: "referral", utm_campaign: "made-with", utm_content: page })}`;
}

export function WeddingFooter({ names, page, credit }: { names: readonly [string, string]; page: WeddingPageType; credit: CreditSource }) {
  return <footer className="wedding-footer">
    <BotanicalArt />
    <div className="wedding-signature"><p>With love,</p><p>{names.join(" & ")}</p></div>
    <div className="wedding-seal" aria-hidden="true"><span>{Array.from(names[0])[0]}<i>&amp;</i>{Array.from(names[1])[0]}</span><small>Always & forever</small></div>
    {/* A new tab keeps the guest on the wedding page; noreferrer backs up the site-wide no-referrer policy. */}
    <p className="wedding-credit"><a href={creditHref(credit, page)} target="_blank" rel="noopener noreferrer">Made with SaveTheDates<span className="sr-only"> (opens in a new tab)</span></a></p>
  </footer>;
}
