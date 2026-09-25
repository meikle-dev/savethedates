import type { Metadata } from "next";
import Link from "next/link";
import { parsePhotoFraming } from "@/features/weddings/photo-framing";
import { swatchBackground, themes } from "@/features/weddings/themes";
import { PhotoForm } from "@/features/workspace/photo-form";
import { Icon } from "@/features/workspace/workspace-icons";
import { requireWedding } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Design · SaveTheDates" };

export default async function Design() {
  const { wedding, live } = await requireWedding();
  const current = themes.find((theme) => theme.id === wedding.theme)!;
  return <WorkspacePage id="design-title" eyebrow="Design" title="Your wedding style" intro="Choose how your guest pages look, and add the photo guests see first.">
    <div className="ws-stack">
      <section aria-labelledby="theme-title" className="ws-panel">
        <h2 id="theme-title">Theme</h2>
        <div className="ws-theme">
          <span className="ws-theme-swatch" aria-hidden="true" style={{ background: swatchBackground(current.swatch) }} />
          <div className="ws-theme-text">
            <p className="ws-theme-heading"><span className="ws-theme-name">{current.name}</span><span className="tag">Current theme</span></p>
            <p className="ws-theme-description">{current.description}</p>
          </div>
          <Link href="/dashboard/preview" className="button button-primary ws-theme-action">Change theme<Icon name="arrowRight" /></Link>
        </div>
        <p className="ws-theme-note"><span className="ws-theme-dots" aria-hidden="true">{themes.map((theme) => <span key={theme.id} style={{ background: swatchBackground(theme.swatch) }} />)}</span>Try {themes.length} themes with your own content. Nothing changes until you apply one.</p>
      </section>
      <section aria-labelledby="photo-title" className="ws-panel">
        <h2 id="photo-title">Your photo</h2>
        <PhotoForm published={live} photo={!!wedding.photo_path} photoFraming={parsePhotoFraming(wedding.photo_framing)} theme={wedding.theme} />
      </section>
    </div>
  </WorkspacePage>;
}
