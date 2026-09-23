"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { swatchBackground, themes, type WeddingTheme } from "@/features/weddings/themes";
import { ThemeApplyForm } from "./theme-apply-form";
import { Icon } from "./workspace-icons";

type Props = { label: string; note?: string; path: string; backHref: string; theme: WeddingTheme; savedTheme: WeddingTheme; published: boolean };

// Choosing a theme only changes the previewed URL; Apply theme is the sole way to save it.
export function PreviewToolbar({ label, note, path, backHref, theme, savedTheme, published }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(theme);
  const [pending, startTransition] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.querySelector(":checked")?.closest("label")?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [selected]);
  // Prefetch both neighbours so arrow cycling feels instant.
  useEffect(() => {
    const at = themes.findIndex((option) => option.id === selected);
    for (const offset of [-1, 1]) router.prefetch(`${path}?theme=${themes[(at + offset + themes.length) % themes.length].id}`);
  }, [router, path, selected]);
  const index = themes.findIndex((option) => option.id === selected);
  const current = themes[index];
  // Arrows wrap around so owners can cycle through every theme in either direction.
  const step = (offset: number) => themes[(index + offset + themes.length) % themes.length];
  const choose = (id: WeddingTheme) => {
    if (id === selected) return;
    setSelected(id);
    startTransition(() => router.replace(`${path}?theme=${id}`, { scroll: false }));
  };
  return <section aria-label="Preview controls" className="platform preview-bar" data-pending={pending || undefined}>
    <div className="preview-bar-inner">
      <div className="preview-bar-top">
        <Link href={backHref} className="button button-quiet button-flush"><Icon name="arrowLeft" /><span className="max-sm:sr-only">Back to workspace</span><span aria-hidden="true" className="sm:hidden">Workspace</span></Link>
        <p className="preview-bar-title"><span className="badge"><Icon name="lock" />Private {label} preview</span><span className="status"><Icon name="check" />Saved content{note ? ` · ${note}` : ""}</span></p>
      </div>
      <div className="preview-bar-main">
        <form action={path} className="preview-themes">
          <fieldset>
            <legend className="preview-bar-legend">Theme <span className="preview-bar-count">{index + 1} of {themes.length}</span>{pending ? <span className="preview-bar-loading" role="status"> · Loading preview…</span> : null}</legend>
            <div className="theme-stepper">
              <button type="button" className="theme-step" onClick={() => choose(step(-1).id)} aria-label={`Previous theme: ${step(-1).name}`}><Icon name="chevron" /></button>
              <div className="theme-stepper-current">
                <p className="theme-stepper-name">
                  <span className="theme-stepper-palette" aria-hidden="true">{current.swatch.map((colour) => <span key={colour} style={{ background: colour }} />)}</span>
                  <span>{current.name}</span>
                  {current.id === savedTheme && <span className="theme-stepper-current-tag">Current</span>}
                </p>
                <p className="theme-stepper-description">{current.description}</p>
              </div>
              <button type="button" className="theme-step theme-step-next" onClick={() => choose(step(1).id)} aria-label={`Next theme: ${step(1).name}`}><Icon name="chevron" /></button>
            </div>
            <div ref={list} className="theme-dots">
              {themes.map((option) => <label key={option.id} className="theme-dot" title={option.name}>
                <input type="radio" name="theme" value={option.id} checked={selected === option.id} onChange={() => choose(option.id)} />
                <span className="theme-dot-swatch" aria-hidden="true" style={{ background: swatchBackground(option.swatch) }} />
                <span className="sr-only">{option.name}{option.id === savedTheme ? " (current theme)" : ""}</span>
                {option.id === savedTheme && <span className="theme-dot-saved" aria-hidden="true" />}
              </label>)}
            </div>
          </fieldset>
          <noscript><button className="button button-secondary mt-3">Show theme</button></noscript>
        </form>
        <ThemeApplyForm key={theme} theme={theme} name={themes.find((option) => option.id === theme)!.name} current={theme === savedTheme} published={published} />
      </div>
    </div>
  </section>;
}
