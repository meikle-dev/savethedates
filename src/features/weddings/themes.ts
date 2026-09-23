// Swatch colours mirror each theme's tokens in wedding.css: surface, accent, tint.
export const themes = [
  { id: "minimal", name: "Modern Minimal", description: "Calm sage, warm paper and timeless typography.", swatch: ["#f5f1e8", "#526044", "#e5e6d8"] },
  { id: "romantic", name: "Warm & Romantic", description: "Soft cream, muted rose and intimate photography.", swatch: ["#fff4eb", "#7c3446", "#f1d8cf"] },
  { id: "bold", name: "Modern & Bold", description: "Deep teal, strong photography and editorial type.", swatch: ["#f1f3e9", "#164b49", "#dce8b3"] },
] as const;
export type WeddingTheme = typeof themes[number]["id"];
export function isWeddingTheme(value: unknown): value is WeddingTheme {
  return themes.some((theme) => theme.id === value);
}
export function swatchBackground(swatch: readonly string[]) {
  return `linear-gradient(135deg, ${swatch[0]} 0 48%, ${swatch[1]} 48% 76%, ${swatch[2]} 76%)`;
}
