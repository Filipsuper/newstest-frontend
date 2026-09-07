import { ImageResponse } from "next/og";
import { loadStory } from "../../../utils/storyServer";
import { normalizeStory, finiteNumber } from "../../../utils/newsroom";
import { reactionGeometry } from "../../../utils/reactionGeometry";
import { tagLabel } from "../../../utils/newsTags";
import { loadOgFonts } from "../../../og/_shared/fonts";
import { OgBrand, OgCanvas, OgChangeBadge } from "../../../og/_shared/elements";
import {
  OG_SIZE,
  ogThemes,
  ogDate,
  previewText,
} from "../../../og/_shared/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const colors = ogThemes.light;

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
  const geometry = reactionGeometry(
    result.detail.reactionSeries,
    story.ts,
    520,
    120,
  );
  const chartColor =
    geometry?.points.at(-1).pct < 0 ? colors.negative : colors.positive;
  const title = previewText(story.title, geometry ? 185 : 230);
  const titleSize = geometry
    ? title.length > 150
      ? 44
      : title.length > 100
        ? 50
        : 58
    : title.length > 175
      ? 46
      : title.length > 110
        ? 56
        : 64;
  const tag = tagLabel(
    (story.labels ?? []).find((tag) => tag !== "REGULATORY") || "NEWS",
  );
  const source =
    story.sources[0]?.publisher || story.sources[0]?.name || "OMXsum";
  const published = ogDate(story.ts, { hour: "2-digit", minute: "2-digit" });

  return new ImageResponse(
    (
      <OgCanvas>
        <div
          style={{
            display: "flex",
            height: 40,
            flexShrink: 0,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <OgBrand />
          <span style={{ fontSize: 24, color: colors.secondary }}>{tag}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            paddingTop: 24,
            paddingBottom: 24,
            gap: 12,
          }}
        >
          <div
            style={{ display: "flex", fontSize: 26, color: colors.secondary }}
          >
            {previewText(story.company || "Marknadsnyheter", 70)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              lineHeight: 1.12,
              letterSpacing: -1.6,
              fontWeight: 600,
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </div>
        </div>
        {(geometry || pct !== null) && (
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 32,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: geometry ? 490 : 1088,
              }}
            >
              {pct !== null && <OgChangeBadge value={pct} />}
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: colors.secondary,
                }}
              >
                {pct !== null ? label : "Kursförlopp kring publicering"}
              </div>
            </div>
            {geometry && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 520,
                  flexShrink: 0,
                }}
              >
                <svg width="520" height="120" viewBox="0 0 520 120">
                  <line
                    x1="44"
                    x2="504"
                    y1={geometry.zero}
                    y2={geometry.zero}
                    stroke={colors.line}
                  />
                  <path d={geometry.area} fill={chartColor} opacity="0.08" />
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={chartColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {geometry.marker !== null && (
                    <line
                      x1={geometry.marker}
                      x2={geometry.marker}
                      y1="12"
                      y2="104"
                      stroke={colors.secondary}
                      strokeDasharray="4 5"
                    />
                  )}
                </svg>
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 44,
                    fontSize: 20,
                    color: colors.secondary,
                  }}
                >
                  {`Kursförlopp till ${ogDate(geometry.points.at(-1).t, { hour: "2-digit", minute: "2-digit" })}`}
                </div>
              </div>
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            fontSize: 22,
            color: colors.secondary,
          }}
        >
          <span>{`${previewText(source, 38)}${published ? ` · ${published}` : ""}`}</span>
          <span>
            {fixed || pct === null
              ? "omxsum.com"
              : `Bild ${ogDate(Date.now(), { hour: "2-digit", minute: "2-digit" })}`}
          </span>
        </div>
      </OgCanvas>
    ),
    {
      ...OG_SIZE,
      fonts: await loadOgFonts(),
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    },
  );
}
