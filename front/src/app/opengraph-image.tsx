import { ImageResponse } from "next/og";

export const alt = "VoltHouse — Backup power systems";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
          padding: "72px",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "16px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 900,
            }}
          >
            V
          </div>
          <div style={{ fontSize: "46px", fontWeight: 900, letterSpacing: "-1px", display: "flex" }}>
            <span>VOLT</span>
            <span style={{ fontWeight: 300 }}>HOUSE</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "66px", fontWeight: 800, lineHeight: 1.05, maxWidth: "980px" }}>
            Backup power for your home &amp; business
          </div>
          <div style={{ fontSize: "30px", color: "#94a3b8" }}>
            Inverters · LiFePO4 batteries · Solar panels · Power stations
          </div>
        </div>

        <div style={{ fontSize: "26px", color: "#60a5fa" }}>volthouse</div>
      </div>
    ),
    { ...size }
  );
}
