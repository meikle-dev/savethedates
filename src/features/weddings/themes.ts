// Picker order runs broadly light to dark with neighbours distinct in hue (dark Velvet precedes Black Tie). Swatches echo theme tokens
// but are chosen so every dot stays distinguishable at selector size.
export const themes = [
  { id: "minimal", name: "Modern Minimal", description: "Calm sage, warm paper and timeless typography.", swatch: ["#f5f1e8", "#526044", "#e5e6d8"] },
  { id: "romantic", name: "Warm & Romantic", description: "Soft cream, muted rose and intimate photography.", swatch: ["#fff4eb", "#7c3446", "#f1d8cf"] },
  { id: "bold", name: "Modern & Bold", description: "Deep teal, strong photography and editorial type.", swatch: ["#f1f3e9", "#164b49", "#dce8b3"] },
  { id: "terracotta", name: "Terracotta", description: "Sun-baked clay, olive branches and linen.", swatch: ["#f1e1d3", "#b4583a", "#7c8452"] },
  { id: "heather", name: "Heather", description: "Misty lilac, moorland heather and slate.", swatch: ["#e6dee8", "#6b4e71", "#8a95a0"] },
  { id: "coastal", name: "Coastal", description: "Sea glass, driftwood and sea holly.", swatch: ["#dce6e3", "#2f5563", "#b9a27f"] },
  { id: "riviera", name: "Riviera", description: "Linen, Riviera blue stripes and lemons.", swatch: ["#f6efe3", "#27468a", "#e8c547"] },
  { id: "alcantara", name: "Alcantara", description: "Soft suede, cognac and deep espresso.", swatch: ["#e4d9cc", "#6b4a36", "#b89a7e"] },
  { id: "countryside", name: "Countryside", description: "Oatmeal tweed, loden green and bracken.", swatch: ["#e3d9c4", "#3b4431", "#a5562e"] },
  { id: "velvet", name: "Velvet", description: "Claret velvet, blush paper and gold ribbon.", swatch: ["#5a1822", "#b8924e", "#eee5de"] },
  { id: "black-tie", name: "Black Tie", description: "Black grosgrain, ivory letterpress and orchids.", swatch: ["#faf9f6", "#141414", "#908f8c"] },
  { id: "evening-gold", name: "Evening Gold", description: "Midnight navy, candlelight and champagne.", swatch: ["#1c2533", "#c9a96a", "#141b26"] },
] as const;
export type WeddingTheme = typeof themes[number]["id"];
export function isWeddingTheme(value: unknown): value is WeddingTheme {
  return themes.some((theme) => theme.id === value);
}
export function swatchBackground(swatch: readonly string[]) {
  return `linear-gradient(135deg, ${swatch[0]} 0 48%, ${swatch[1]} 48% 76%, ${swatch[2]} 76%)`;
}
