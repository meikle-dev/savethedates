import { themes, type WeddingTheme } from "@/features/weddings/themes";

export function ThemePicker({ selected }: { selected: WeddingTheme }) {
  return <form action="/dashboard/preview" className="mt-6">
    <fieldset>
      <legend className="field-label">Choose a theme to preview</legend>
      <div className="grid gap-3 md:grid-cols-3">
        {themes.map((theme) => <label key={theme.id} className="theme-option">
          <input type="radio" name="theme" value={theme.id} defaultChecked={selected === theme.id} />
          <span><span className="block font-semibold">{theme.name}</span><span className="mt-2 block text-sm leading-relaxed">{theme.description}</span></span>
        </label>)}
      </div>
    </fieldset>
    <button className="primary-button mt-5">Preview theme</button>
  </form>;
}
