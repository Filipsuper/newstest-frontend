import { ImageResponse } from "next/og";
import { loadStory } from "../../../utils/storyServer";
import { normalizeStory, finiteNumber } from "../../../utils/newsroom";
import { stockChartGeometry, stockChartPriceLabel } from "../../../utils/stockChartGeometry";
import { fetchStoryStockChart } from "../../../utils/api";
import { storyStockChartFor } from "../../../utils/storyStockChart";
import { rowReaction, legacyReactionMatches } from "../../../utils/reactionV2";
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
  const observation = rowReaction(story);
  const useObservation = observation.version === 2 || Boolean(observation.companySession) || !legacyReactionMatches(story);
  const pct = useObservation ? observation.pct : finiteNumber(
    fixed ? story.reaction[fixed[0]] : story.reaction?.pct,
  );
  const label = useObservation ? observation.label : fixed?.[1] || "Sedan publicering · ögonblicksbild";
  // Independent absolute-price chart, identical to the reader. Optional history
  // failure never blocks sharing the news or changes its fixed reaction badge.
  const chart = story.symbol ? await fetchStoryStockChart(story.id, story.symbol)
    .then(value => storyStockChartFor(story, story.symbol, value)).catch(() => null) : null;
  const geometry = stockChartGeometry(chart, 520, 120);
  const chartColor = colors.accent;
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
                {pct !== null ? label : "Aktiekurs kring nyheten"}
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
                  {geometry.ticks.map(tick => <line key={tick.value} x1={geometry.plot.left} x2={geometry.plot.right}
                    y1={tick.y} y2={tick.y} stroke={colors.line} />)}
                  <path d={geometry.area} fill={chartColor} opacity="0.08" />
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={chartColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {geometry.singlePoint && <circle cx={geometry.singlePoint.x} cy={geometry.singlePoint.y} r="4" fill={chartColor} />}
                  {geometry.marker?.kind === "publication" && (
                    <line
                      x1={geometry.marker.x}
                      x2={geometry.marker.x}
                      y1={geometry.plot.top}
                      y2={geometry.plot.bottom}
                      stroke={colors.secondary}
                      strokeDasharray="4 5"
                    />
                  )}
                </svg>
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 8,
                    fontSize: 20,
                    color: colors.secondary,
                  }}
                >
                  {`Kurs ${stockChartPriceLabel(geometry.points.at(-1).price)}${/^[A-Z]{3}$/.test(chart.currency ?? "") ? ` ${chart.currency}` : ""} · ${ogDate(chart.observedAt, { hour: "2-digit", minute: "2-digit" })}`}
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
            {observation.scope === "session"
              ? `Kurs ${ogDate(observation.asOf, { hour: "2-digit", minute: "2-digit" })}`
              : fixed || pct === null
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
