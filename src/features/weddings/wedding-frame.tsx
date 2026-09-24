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

export function WeddingFooter({ names }: { names: readonly [string, string] }) {
  return <footer className="wedding-footer">
    <BotanicalArt />
    <div className="wedding-signature"><p>With love,</p><p>{names.join(" & ")}</p></div>
    <div className="wedding-seal" aria-hidden="true"><span>{Array.from(names[0])[0]}<i>&amp;</i>{Array.from(names[1])[0]}</span><small>Always & forever</small></div>
  </footer>;
}
