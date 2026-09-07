import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_NAME, BRAND_VERSION } from "../../utils/brand";
import { formatChange } from "../../components/ui/format";
import preview from "./preview.json";

export const runtime = "nodejs";
export const dynamic = "force-static";

// Satori cannot resolve CSS variables: keep these in sync with tokens.css.
// Only the composition is illustrative. News/reactions are a dated, public
// snapshot with retained provenance, never invented numbers or a live promise.
const color = {
  canvas: "#f6f5f1",
  text: "#252620",
  secondary: "#62655c",
  accent: "#89610e",
  accentSoft: "#f5ebcb",
  surface: "#ffffff",
  dark: "#171916",
  row: "#22251f",
  light: "#f2f3ed",
  muted: "#adb3a5",
  positive: "#82cea3",
  positiveSoft: "#25382c",
  negative: "#ef9990",
  negativeSoft: "#3e2b27",
};

function NewsPreview({ story }) {
  const pct = story.reaction?.pct;
  const hasReaction = Number.isFinite(pct);
  const positive = pct >= 0;
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        width: "100%",
        background: color.row,
        borderRadius: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-start",
          flexShrink: 0,
          minWidth: 76,
          height: 38,
          padding: "0 10px",
          borderRadius: 10,
          fontSize: 19,
          fontWeight: 600,
          background: hasReaction
            ? positive
              ? color.positiveSoft
              : color.negativeSoft
            : color.row,
          color: hasReaction
            ? positive
              ? color.positive
              : color.negative
            : color.muted,
        }}
      >
        {formatChange(pct, "Nyhet")}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            fontSize: 18,
            lineHeight: 1.4,
            fontWeight: 600,
          }}
        >
          {story.headline}
        </div>
        <div
          style={{ display: "flex", gap: 10, color: color.muted, fontSize: 14 }}
        >
          <span>{story.source.name.toUpperCase()}</span>
          {hasReaction && <span>· Sedan publicering</span>}
        </div>
      </div>
    </div>
  );
}

export async function GET() {
  const [regular, semibold] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "public/fonts/Geist-SemiBold.ttf")),
  ]);
  const snapshotDate = new Date(preview.capturedAt).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Stockholm",
    },
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: color.canvas,
          color: color.text,
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 54,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 10,
              height: 28,
              borderRadius: 5,
              background: color.accent,
            }}
          />
          <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: -1.2 }}>
            {BRAND_NAME}
          </span>
          <span
            style={{
              fontSize: 18,
              padding: "5px 10px",
              background: color.accentSoft,
              color: color.accent,
              borderRadius: 8,
            }}
          >
            {BRAND_VERSION}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 60,
            top: 184,
            display: "flex",
            flexDirection: "column",
            width: 550,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -3.8,
            }}
          >
            <span>Förstå vad</span>
            <span>som driver</span>
            <span style={{ color: color.accent }}>börsen.</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginTop: 28,
              color: color.secondary,
              fontSize: 24,
              lineHeight: 1.4,
            }}
          >
            <span>Nyheterna. Reaktionerna.</span>
            <span>Bolagen du följer.</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 610,
            top: 80,
            width: 584,
            height: 486,
            display: "flex",
            flexDirection: "column",
            padding: 28,
            gap: 22,
            borderRadius: 28,
            background: color.dark,
            color: color.light,
            border: "6px solid #ffffff",
            boxShadow: "0 18px 60px rgba(37, 38, 32, 0.15)",
            transform: "rotate(-4deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{ fontSize: 27, fontWeight: 600, letterSpacing: -0.8 }}
            >
              Marknaden
            </span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={color.muted}
              strokeWidth="1.8"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              fontSize: 16,
            }}
          >
            <span
              style={{
                paddingBottom: 10,
                borderBottom: "2px solid " + color.light,
              }}
            >
              Överblick
            </span>
            <span style={{ color: color.muted, paddingBottom: 10 }}>
              Nyhetsflöde
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>
              Viktigast just nu
            </span>
            {preview.stories.map((story) => (
              <NewsPreview key={story.id} story={story} />
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 580,
            top: 504,
            width: 564,
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "22px 26px",
            background: color.surface,
            borderRadius: 20,
            boxShadow: "0 12px 40px rgba(37, 38, 32, 0.12)",
            transform: "rotate(-2deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 58,
              height: 58,
              borderRadius: 16,
              background: color.accentSoft,
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke={color.accent}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{ fontSize: 25, fontWeight: 600, letterSpacing: -0.5 }}
            >
              Börsdagen börjar här.
            </span>
            <span style={{ fontSize: 18, color: color.secondary }}>
              Morgonbrevet · Gratis varje börsmorgon
            </span>
          </div>
        </div>

        <span
          style={{
            position: "absolute",
            left: 60,
            bottom: 40,
            fontSize: 20,
            color: color.secondary,
          }}
        >
          omxsum.com
        </span>
        <span
          style={{
            position: "absolute",
            left: 654,
            top: 54,
            color: color.secondary,
            fontSize: 14,
          }}
        >
          Produktvy · Nyhetsbild {snapshotDate}
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    },
  );
}
