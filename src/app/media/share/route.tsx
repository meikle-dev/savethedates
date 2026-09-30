import { ImageResponse } from "next/og";
// ?page=offer is the /what-we-offer card (F070); anything else gets the homepage card.
const cards = {
  home: { lines: ["Your wedding website,", "beautifully done."], footer: "Save the Date, invitation and RSVP. One £19 payment." },
  offer: { lines: ["Everything we offer,", "in twelve designs."], footer: "Save the Date, invitation, details, RSVP and table plan." },
};

export function GET(request: Request) {
  const card = new URL(request.url).searchParams.get("page") === "offer" ? cards.offer : cards.home;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 70, background: "#0b2a3d", color: "#f8f6f0" }}><div style={{ fontSize: 32 }}>SaveTheDates</div><div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.1 }}>{card.lines.map((line) => <span key={line}>{line}</span>)}</div><div style={{ fontSize: 28 }}>{card.footer}</div></div>, { width: 1200, height: 630 });
}
