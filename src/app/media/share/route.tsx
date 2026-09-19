import { ImageResponse } from "next/og";
export function GET() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 70, background: "#0b2a3d", color: "#f8f6f0" }}><div style={{ fontSize: 32 }}>SaveTheDates</div><div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.1 }}><span>Your wedding website,</span><span>beautifully done.</span></div><div style={{ fontSize: 28 }}>Three themes. One £29 payment. A beautiful beginning.</div></div>, { width: 1200, height: 630 });
}
