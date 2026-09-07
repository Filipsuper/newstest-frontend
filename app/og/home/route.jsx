import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_VERSION, LANDING_HEADLINE } from "../../utils/brand";

export const runtime = "nodejs";
export const dynamic = "force-static";

// ImageResponse cannot resolve CSS variables. These are the foundation's exact
// light palette values; no fake stocks, reactions or portfolio data in the image.
const palette = {
  canvas: "#f6f5f1",
  text: "#252620",
  secondary: "#62655c",
  accent: "#89610e",
  accentSoft: "#f5ebcb",
  surface: "#ffffff",
};

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 60px",
          background: palette.canvas,
          color: palette.text,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 28,
                borderRadius: 5,
                background: palette.accent,
              }}
            />
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>
              {BRAND_NAME}
            </span>
            <span
              style={{
                fontSize: 20,
                padding: "6px 12px",
                background: palette.accentSoft,
                color: palette.accent,
                borderRadius: 8,
              }}
            >
              {BRAND_VERSION}
            </span>
          </div>
          <span style={{ fontSize: 20, color: palette.secondary }}>
            omxsum.com
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 70,
              lineHeight: 1.1,
              letterSpacing: -3,
              fontWeight: 700,
            }}
          >
            {LANDING_HEADLINE.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <span style={{ fontSize: 26, color: palette.secondary }}>
            Börsnyheterna och sammanhanget. Samlat på ett ställe.
          </span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["Nyheter med källor", "Aktiernas reaktioner", "Din bevakning"].map(
            (text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "18px 24px",
                  borderRadius: 12,
                  background: palette.surface,
                  fontSize: 22,
                }}
              >
                {text}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    },
  );
}
