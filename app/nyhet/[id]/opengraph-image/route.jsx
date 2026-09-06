import { ImageResponse } from "next/og";
import { loadStory } from "../../../utils/storyServer";
import {
  normalizeStory,
  finiteNumber,
  newsDate,
} from "../../../utils/newsroom";
import { reactionGeometry } from "../../../utils/reactionGeometry";
import { tagLabel } from "../../../utils/newsTags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The same public event as the reader. Never use user data or invented curves.
export async function GET(request, { params }) {
  const { id } = await params;
  const result = await loadStory(id);
  if (!result.detail)
    return new Response("Nyheten är inte tillgänglig", {
      status: result.notFound ? 404 : 503,
    });
  const story = normalizeStory(result.detail.story ?? result.detail);
  const fixed = [
    ["h1Pct", "1 timme efter publicering"],
    ["d1Pct", "1 dag efter publicering"],
    ["m15Pct", "15 min efter publicering"],
  ].find(([key]) => finiteNumber(story.reaction?.[key]) !== null);
  const pct = finiteNumber(
    fixed ? story.reaction[fixed[0]] : story.reaction?.pct,
  );
  const label = fixed?.[1] || "Sedan publicering · ögonblicksbild";
  const color = pct === null ? "#ebc467" : pct < 0 ? "#ef9990" : "#82cea3";
  const geometry = reactionGeometry(
    result.detail.reactionSeries,
    story.ts,
    330,
    180,
  );
  const chartColor = geometry?.points.at(-1).pct < 0 ? "#ef9990" : "#82cea3";
  const title =
    story.title.length > 230
      ? `${story.title.slice(0, 227).trimEnd()}…`
      : story.title;
  const tag = tagLabel(
    (story.labels ?? []).find((tag) => tag !== "REGULATORY") || "NEWS",
  );
  const source =
    story.sources[0]?.publisher || story.sources[0]?.name || "OMXsum";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f6f5f1",
          color: "#252620",
          padding: "44px 48px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                width: 14,
                height: 28,
                borderRadius: 7,
                background: "#c99a32",
              }}
            />
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>
              OMXsum
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              fontSize: 18,
              color: "#62655c",
            }}
          >
            <span>{tag}</span>
            <span>·</span>
            <span>{newsDate(story.ts)}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 40,
            alignItems: "center",
            paddingTop: 28,
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 692,
              gap: 22,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: "#62655c" }}>
              {(story.company || "Marknadsnyheter").slice(0, 58)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize:
                  title.length > 165 ? 34 : title.length > 110 ? 40 : 48,
                lineHeight: 1.15,
                letterSpacing: -1.5,
                fontWeight: 700,
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", fontSize: 17, color: "#62655c" }}>
              Källa: {String(source).slice(0, 60)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 350,
              height: 342,
              padding: "28px 24px",
              background: "#22251f",
              borderRadius: 24,
              color: "#f2f3ed",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", fontSize: 18, color: "#adb3a5" }}>
                {story.symbol?.replace(".ST", "") || "Nyheten i fokus"}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: pct === null ? 34 : 56,
                  lineHeight: 1.1,
                  letterSpacing: -2,
                  color,
                }}
              >
                {pct === null
                  ? "Bakom rubriken."
                  : `${pct > 0 ? "+" : ""}${pct.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: "#adb3a5",
                }}
              >
                {pct === null ? "Nyheten. Källorna. Sammanhanget." : label}
              </div>
            </div>
            {geometry ? (
              <svg width="302" height="142" viewBox="0 0 330 180">
                <line
                  x1="44"
                  x2="314"
                  y1={geometry.zero}
                  y2={geometry.zero}
                  stroke="#3b4036"
                />
                <path d={geometry.area} fill={chartColor} opacity="0.09" />
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={chartColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {geometry.marker !== null && (
                  <line
                    x1={geometry.marker}
                    x2={geometry.marker}
                    y1="20"
                    y2="150"
                    stroke="#adb3a5"
                    strokeDasharray="4 5"
                  />
                )}
              </svg>
            ) : (
              <div style={{ display: "flex", fontSize: 18, color: "#adb3a5" }}>
                {pct === null
                  ? "Läs hela nyheten →"
                  : "Observerad kursförändring"}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 16,
            color: "#62655c",
          }}
        >
          <span>Nyheterna bakom börsens rörelser.</span>
          <span>
            {fixed || pct === null
              ? "omxsum.com"
              : `Bild skapad ${newsDate(Date.now())} · omxsum.com`}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    },
  );
}
