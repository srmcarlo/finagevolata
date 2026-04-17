import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FinAgevolata — La piattaforma dove consulenti e aziende lavorano insieme sui bandi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #ECFDF5 100%)",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: "#6366F1" }}>FinAgevolata</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#0F172A",
            textAlign: "center",
            lineHeight: 1.15,
            marginTop: 40,
            letterSpacing: "-0.02em",
          }}
        >
          Consulenti e aziende insieme sui bandi.
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#475569",
            marginTop: 30,
            textAlign: "center",
          }}
        >
          Finanza agevolata senza Excel, senza email perse.
        </div>
      </div>
    ),
    { ...size },
  );
}
