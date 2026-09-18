export const themes = [
  { id: "minimal", name: "Modern Minimal", description: "Calm sage, warm paper and timeless typography." },
  { id: "romantic", name: "Warm & Romantic", description: "Soft cream, muted rose and intimate photography." },
  { id: "bold", name: "Modern & Bold", description: "Deep teal, strong photography and editorial type." },
] as const;
export type WeddingTheme = typeof themes[number]["id"];
export function isWeddingTheme(value: unknown): value is WeddingTheme {
  return themes.some((theme) => theme.id === value);
}
