"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { swatchBackground, themes, type WeddingTheme } from "@/features/weddings/themes";
import { ThemeApplyForm } from "./theme-apply-form";

type Props = { label: string; note?: string; path: string; backHref: string; theme: WeddingTheme; savedTheme: WeddingTheme; published: boolean };

// Choosing a theme only changes the previewed URL; Apply theme is the sole way to save it.
export function PreviewToolbar({ label, note, path, backHref, theme, savedTheme, published }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(theme);
  const [pending, startTransition] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.querySelector(":checked")?.closest("label")?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, []);
  const choose = (id: WeddingTheme) => {
    setSelected(id);
    startTransition(() => router.replace(`${path}?theme=${id}`, { scroll: false }));
  };
  return <section aria-label="Preview controls" className="platform preview-bar" data-pending={pending || undefined}>
    <div className="preview-bar-inner">
      <div className="preview-bar-top">
        <Link href={backHref} className="preview-bar-back"><span aria-hidden="true">←</span><span className="max-sm:sr-only">Back to workspace</span><span aria-hidden="true" className="sm:hidden">Workspace</span></Link>
        <p className="preview-bar-title"><span className="preview-bar-badge">Private {label} preview</span><span className="preview-bar-note">Saved content{note ? ` · ${note}` : ""}</span></p>
      </div>
      <div className="preview-bar-main">
        <form action={path} className="preview-themes">
          <fieldset>
            <legend className="preview-bar-legend">Theme{pending ? <span className="preview-bar-loading" role="status"> · Loading preview…</span> : null}</legend>
            <div ref={list} className="preview-theme-list">
              {themes.map((option) => <label key={option.id} className="preview-theme" title={option.description}>
                <input type="radio" name="theme" value={option.id} checked={selected === option.id} onChange={() => choose(option.id)} />
                <span className="preview-theme-swatch" aria-hidden="true" style={{ background: swatchBackground(option.swatch) }} />
                <span className="preview-theme-name">{option.name}</span>
                {option.id === savedTheme && <span className="preview-theme-current">Current</span>}
              </label>)}
            </div>
          </fieldset>
          <noscript><button className="ws-button mt-3">Show theme</button></noscript>
        </form>
        <ThemeApplyForm key={theme} theme={theme} name={themes.find((option) => option.id === theme)!.name} current={theme === savedTheme} published={published} />
      </div>
    </div>
  </section>;
}
