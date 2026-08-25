import { ImageResponse } from "next/og";

export const alt = "E-Kit — сонячна енергетика та резервне живлення";
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
          background: "linear-gradient(135deg, #111111 0%, #1c1c1c 65%, #292929 100%)",
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
              background: "#FFC107",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 900,
              color: "#111111",
            }}
          >
            E
          </div>
          <div style={{ fontSize: "46px", fontWeight: 900, letterSpacing: "-1px", display: "flex" }}>
            <span>E-Kit</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "66px", fontWeight: 800, lineHeight: 1.05, maxWidth: "980px" }}>
            Сонячна енергетика та резервне живлення
          </div>
          <div style={{ fontSize: "30px", color: "#94a3b8" }}>
            Інвертори · LiFePO4 акумулятори · Сонячні панелі · Зарядні станції
          </div>
        </div>

        <div style={{ fontSize: "26px", color: "#FFC107" }}>e-kit.com.ua · енергія для незалежності</div>
      </div>
    ),
    { ...size }
  );
}
