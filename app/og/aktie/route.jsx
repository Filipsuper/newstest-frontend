import { ImageResponse } from "next/og";
import { loadOgFonts } from "../_shared/fonts";
import { OgBrand, OgCanvas, OgChangeBadge } from "../_shared/elements";
import { OG_SIZE, ogThemes, ogDate, previewText } from "../_shared/theme";

// The share card for a stock's move. Rendered as a route handler rather than an
// opengraph-image convention because it has to vary by ?range= — the share
// modal previews this exact URL, so what you see before sharing is the image
// that unfurls afterwards.

export const runtime = "nodejs";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

const RANGES = {
  "1d": { label: "1 dag", intraday: true },
  "6m": { label: "6 månader", sessions: 130 },
  "1y": { label: "1 år", sessions: 260 },
  "3y": { label: "3 år", sessions: 780 },
  "5y": { label: "5 år", sessions: 1300 },
};

const SIZE = OG_SIZE;
// Plot plus the right-hand price gutter and bottom date axis, matching the
// structure of the Recharts chart on the company page.
const CHART = { width: 1104, height: 260, axis: 100, xAxis: 36 };

// The dark theme's chart tokens — this card always renders dark.
const colors = ogThemes.dark;
const YELLOW = colors.accent;
const YELLOW_BRIGHT = "#f3d98d";
const BLUE = "#86a5ef";
const MUTED_LINE = colors.secondary;
const VOLUME = "rgba(235, 196, 103, 0.11)";
const MUTED_VOLUME = "rgba(173, 179, 165, 0.08)";
const GRID = colors.line;
const MUTED = colors.secondary;

const svDecimal = (value, digits = 1) =>
  Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const svDate = (value) => ogDate(value);
const svTime = (value) =>
  new Date(value).toLocaleTimeString("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
  });

function movingAverage(rows, window) {
  let sum = 0;
  return rows.map((row, index) => {
    sum += row.close ?? 0;
    if (index >= window) sum -= rows[index - window].close ?? 0;
    return index >= window - 1 ? sum / window : null;
  });
}

// Round gridline values over [min, max], the way the chart's "auto" domain does.
function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough) *
    magnitude;
  const ticks = [];
  for (let value = Math.ceil(min / step) * step; value <= max; value += step)
    ticks.push(value);
  return ticks;
}

// Build the same smooth, monotone curve Recharts uses without depending on a
// browser DOM. Null values split the line into separate drawable sections.
function monotonePath(rows, key, x, y) {
  const sections = [];
  let current = [];
  rows.forEach((row, index) => {
    const value = row[key];
    if (value == null || !Number.isFinite(Number(value))) {
      if (current.length) sections.push(current);
      current = [];
      return;
    }
    current.push({ x: x(index), y: y(Number(value)) });
  });
  if (current.length) sections.push(current);

  return sections
    .map((points) => {
      if (points.length === 1)
        return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      const slopes = points
        .slice(0, -1)
        .map(
          (point, index) =>
            (points[index + 1].y - point.y) / (points[index + 1].x - point.x),
        );
      const tangents = points.map((point, index) => {
        if (index === 0) return slopes[0];
        if (index === points.length - 1) return slopes[slopes.length - 1];
        return slopes[index - 1] * slopes[index] <= 0
          ? 0
          : (slopes[index - 1] + slopes[index]) / 2;
      });

      slopes.forEach((slope, index) => {
        if (slope === 0) {
          tangents[index] = 0;
          tangents[index + 1] = 0;
          return;
        }
        const alpha = tangents[index] / slope;
        const beta = tangents[index + 1] / slope;
        const length = Math.hypot(alpha, beta);
        if (length > 3) {
          const scale = 3 / length;
          tangents[index] = scale * alpha * slope;
          tangents[index + 1] = scale * beta * slope;
        }
      });

      let path = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let index = 0; index < points.length - 1; index += 1) {
        const from = points[index];
        const to = points[index + 1];
        const third = (to.x - from.x) / 3;
        path += ` C${(from.x + third).toFixed(1)} ${(from.y + tangents[index] * third).toFixed(1)}`;
        path += ` ${(to.x - third).toFixed(1)} ${(to.y - tangents[index + 1] * third).toFixed(1)}`;
        path += ` ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
      }
      return path;
    })
    .join(" ");
}

// The company-page chart, redrawn as a standalone SVG because Satori cannot
// run Recharts. It keeps the volume scale, smooth curves, right-side price
// ticks and optional MA50/MA200 series. Solid strokes stay legible at share
// size, including perfectly straight/flat paths with zero-height SVG bounds.
function chartSvg(
  rows,
  movingAverages,
  { intraday = false, previousClose = null, live = false } = {},
) {
  const width = CHART.width - CHART.axis;
  const height = CHART.height - CHART.xAxis;
  const pad = 12;

  const seriesKeys = intraday
    ? ["previousPrice", "currentPrice"]
    : [
        "close",
        movingAverages.ma50 && "ma50",
        movingAverages.ma200 && "ma200",
      ].filter(Boolean);
  const values = [
    ...rows.flatMap((row) =>
      seriesKeys.map((key) => row[key]).filter((value) => value != null),
    ),
    ...(previousClose == null ? [] : [previousClose]),
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y = (close) => pad + (1 - (close - min) / span) * (height - pad * 2);
  const stepX = width / (rows.length - 1);
  const x = (index) => index * stepX;

  // Volume shares the axis with the price, scaled to a quarter of the height
  // exactly like the chart's [0, max * 4] volume domain.
  const maxVolume = Math.max(...rows.map((row) => row.volume ?? 0)) || 1;
  const barWidth = Math.max(1, stepX * 0.7);
  const volumeBars = rows
    .map((row, index) => {
      const value = row.volume ?? 0;
      if (!value) return "";
      const barHeight = (value / (maxVolume * 4)) * height;
      const fill =
        intraday && row.session === "previous" ? MUTED_VOLUME : VOLUME;
      return `<rect x="${(x(index) - barWidth / 2).toFixed(1)}" y="${(height - barHeight).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${fill}"/>`;
    })
    .join("");

  const ticks = niceTicks(min, max);
  const horizontals = ticks
    .map(
      (value) =>
        `<line x1="0" y1="${y(value).toFixed(1)}" x2="${width}" y2="${y(value).toFixed(1)}" stroke="${GRID}" stroke-width="1" stroke-dasharray="2 6"/>`,
    )
    .join("");
  const labelIndexes = Array.from(
    new Set(
      [0, 1, 2, 3, 4].map((index) =>
        Math.round((index / 4) * (rows.length - 1)),
      ),
    ),
  );
  const verticals = labelIndexes
    .map(
      (index) =>
        `<line x1="${x(index).toFixed(1)}" y1="0" x2="${x(index).toFixed(1)}" y2="${height}" stroke="${GRID}" stroke-width="1" stroke-dasharray="2 6"/>`,
    )
    .join("");

  const priceLine = monotonePath(
    rows,
    intraday ? "currentPrice" : "close",
    x,
    y,
  );
  const previousLine = intraday
    ? monotonePath(rows, "previousPrice", x, y)
    : "";
  const ma50Line =
    !intraday && movingAverages.ma50 ? monotonePath(rows, "ma50", x, y) : "";
  const ma200Line =
    !intraday && movingAverages.ma200 ? monotonePath(rows, "ma200", x, y) : "";
  const firstCurrentIndex = intraday
    ? rows.findIndex((row) => row.currentPrice != null)
    : -1;
  const lastLiveIndex = intraday
    ? rows.findLastIndex((row) => row.currentPrice != null)
    : -1;
  const liveDot =
    live && lastLiveIndex >= 0
      ? `<circle cx="${x(lastLiveIndex).toFixed(1)}" cy="${y(rows[lastLiveIndex].currentPrice).toFixed(1)}" r="4" fill="${YELLOW_BRIGHT}"/>`
      : "";
  const sessionDivider =
    firstCurrentIndex > 0
      ? `<line x1="${x(firstCurrentIndex).toFixed(1)}" y1="0" x2="${x(firstCurrentIndex).toFixed(1)}" y2="${height}" stroke="${MUTED_LINE}" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="4 6"/>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        ${horizontals}${verticals}${volumeBars}${sessionDivider}
        ${previousLine ? `<path d="${previousLine}" fill="none" stroke="${MUTED_LINE}" stroke-opacity="0.62" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
        <path d="${priceLine}" fill="none" stroke="${YELLOW}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
        ${ma50Line ? `<path d="${ma50Line}" fill="none" stroke="${BLUE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
        ${ma200Line ? `<path d="${ma200Line}" fill="none" stroke="${MUTED_LINE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
        ${liveDot}
    </svg>`;

  return {
    uri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    labels: ticks.map((value) => ({ value, top: y(value) })),
    dateLabels: labelIndexes.map((index) => ({
      value: intraday ? svTime(rows[index].date) : svDate(rows[index].date),
      left: x(index),
      edge:
        index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle",
    })),
    hasMa50: Boolean(ma50Line),
    hasMa200: Boolean(ma200Line),
  };
}

async function loadCompany(symbol) {
  const response = await fetch(
    `${API_URL}/feed/company/${encodeURIComponent(symbol)}/overview`,
    { next: { revalidate: 600 } },
  );
  if (!response.ok) return null;
  return response.json();
}

async function loadIntraday(symbol) {
  const response = await fetch(
    `${API_URL}/feed/company/${encodeURIComponent(symbol)}/intraday`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  return response.json();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = String(searchParams.get("symbol") ?? "")
    .toUpperCase()
    .slice(0, 20);
  const rangeId = RANGES[searchParams.get("range")]
    ? searchParams.get("range")
    : "1y";
  const range = RANGES[rangeId];
  const movingAverageValues = new Set(
    String(searchParams.get("ma") ?? "").split(","),
  );
  const movingAverages = {
    ma50: movingAverageValues.has("50"),
    ma200: movingAverageValues.has("200"),
  };

  const validSymbol = symbol && /^[A-Z0-9.\-]{1,20}$/.test(symbol);
  const [data, intraday] = validSymbol
    ? await Promise.all([
        loadCompany(symbol).catch(() => null),
        range.intraday ? loadIntraday(symbol).catch(() => null) : null,
      ])
    : [null, null];
  const profile = data?.summary?.profile;
  const quote = intraday?.quote ?? data?.summary?.quote;

  const name =
    profile?.name ?? symbol.replace(".ST", "").replaceAll("-", " ") ?? "Omxsum";
  let visible;
  let closes;
  let first;
  let last;
  let chartOptions = {};

  if (range.intraday) {
    const previous = (intraday?.previous ?? []).filter(
      (bar) => bar?.close != null,
    );
    const current = (intraday?.current ?? []).filter(
      (bar) => bar?.close != null,
    );
    visible = [
      ...previous.map((bar) => ({
        ...bar,
        date: bar.time,
        session: "previous",
        previousPrice: bar.close,
        currentPrice: null,
      })),
      ...current.map((bar) => ({
        ...bar,
        date: bar.time,
        session: "current",
        previousPrice: null,
        currentPrice: bar.close,
      })),
    ];
    closes = current.map((bar) => bar.close);
    first = intraday?.previousClose;
    last = closes.at(-1);
    movingAverages.ma50 = false;
    movingAverages.ma200 = false;
    chartOptions = {
      intraday: true,
      previousClose: intraday?.previousClose,
      live: intraday?.quote?.fresh === true,
    };
  } else {
    const bars = (data?.chart?.bars ?? []).filter((bar) => bar?.close != null);
    const ma50Values = movingAverage(bars, 50);
    const ma200Values = movingAverage(bars, 200);
    const enrichedBars = bars.map((bar, index) => ({
      ...bar,
      ma50: ma50Values[index],
      ma200: ma200Values[index],
    }));
    visible = enrichedBars.slice(
      Math.max(0, enrichedBars.length - range.sessions),
    );
    closes = visible.map((bar) => bar.close);
    first = closes[0];
    last = closes.at(-1);
  }
  const returnPct = first && last ? (last / first - 1) * 100 : null;
  const imageOptions = {
    ...SIZE,
    fonts: await loadOgFonts(),
    headers: {
      "Cache-Control": range.intraday
        ? "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
        : "public, max-age=600, s-maxage=600, stale-while-revalidate=86400",
    },
  };
  const companyLabel = previewText(name || "Aktieöversikt", 64);
  const quoteDate = ogDate(quote?.quoteTime, {
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // No fabricated curve or percentage when the selected period lacks data.
  // Keep the company identity, rather than falling back to unrelated marketing.
  if (!Number.isFinite(returnPct) || closes.length < 2) {
    return new ImageResponse(
      (
        <OgCanvas theme="dark">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 40,
            }}
          >
            <OgBrand theme="dark" />
            <span style={{ fontSize: 24, color: MUTED }}>{symbol}</span>
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 60,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: -2,
              }}
            >
              {companyLabel}
            </div>
            {quote?.price != null && (
              <div style={{ display: "flex", fontSize: 48 }}>
                {svDecimal(quote.price, 2)} kr
              </div>
            )}
            <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
              Kurshistorik saknas för {range.label.toLowerCase()}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 22,
              color: MUTED,
            }}
          >
            <span>Nyheterna. Bolaget. Sammanhanget.</span>
            <span>omxsum.com</span>
          </div>
        </OgCanvas>
      ),
      imageOptions,
    );
  }

  const chart = chartSvg(visible, movingAverages, chartOptions);
  const tickStep =
    chart.labels.length > 1
      ? Math.abs(chart.labels[1].value - chart.labels[0].value)
      : 1;
  const tickDigits = Math.min(
    4,
    Math.max(0, -Math.floor(Math.log10(tickStep)) + (tickStep < 1 ? 1 : 0)),
  );

  return new ImageResponse(
    (
      <OgCanvas theme="dark">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 40,
            flexShrink: 0,
          }}
        >
          <OgBrand theme="dark" />
          <div style={{ display: "flex", gap: 16, fontSize: 24, color: MUTED }}>
            <span>{symbol.replace(".ST", "")}</span>
            {profile?.segment && (
              <span>
                · {profile.segment.replaceAll("_", " ").toLowerCase()}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 50,
            flexShrink: 0,
            marginTop: 24,
            alignItems: "center",
            fontSize: companyLabel.length > 48 ? 32 : 42,
            whiteSpace: "nowrap",
            fontWeight: 600,
            letterSpacing: -1.2,
          }}
        >
          {companyLabel}
        </div>
        <div
          style={{
            display: "flex",
            height: 60,
            flexShrink: 0,
            marginTop: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 56,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {quote?.price == null
              ? "Kurs saknas"
              : `${svDecimal(quote.price, 2)} kr`}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 24, color: MUTED }}>{range.label}</span>
            <OgChangeBadge value={returnPct} theme="dark" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "relative",
            flexShrink: 0,
            width: CHART.width,
            height: CHART.height,
            marginTop: 32,
          }}
        >
          <img
            src={chart.uri}
            width={CHART.width - CHART.axis}
            height={CHART.height - CHART.xAxis}
            alt=""
          />
          {chart.labels.map((label) => (
            <div
              key={label.value}
              style={{
                display: "flex",
                position: "absolute",
                right: 0,
                top: label.top - 13,
                width: CHART.axis,
                justifyContent: "flex-end",
                fontSize: 22,
                color: MUTED,
              }}
            >
              {Number(label.value).toLocaleString("sv-SE", {
                maximumFractionDigits: tickDigits,
              })}
            </div>
          ))}
          {chart.dateLabels.map((label) => (
            <div
              key={`${label.value}-${label.left}`}
              style={{
                display: "flex",
                position: "absolute",
                left:
                  label.edge === "start"
                    ? label.left
                    : label.edge === "end"
                      ? label.left - 110
                      : label.left - 55,
                top: CHART.height - CHART.xAxis + 10,
                width: 110,
                justifyContent:
                  label.edge === "start"
                    ? "flex-start"
                    : label.edge === "end"
                      ? "flex-end"
                      : "center",
                fontSize: 20,
                color: MUTED,
              }}
            >
              {label.value}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
            height: 28,
            flexShrink: 0,
            color: MUTED,
            fontSize: 20,
          }}
        >
          <span>{quoteDate ? `Kurs ${quoteDate}` : "omxsum.com"}</span>
          <div style={{ display: "flex", gap: 24 }}>
            {chart.hasMa50 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "flex",
                    width: 20,
                    height: 3,
                    backgroundColor: BLUE,
                  }}
                />
                <span>MA50</span>
              </div>
            )}
            {chart.hasMa200 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "flex",
                    width: 20,
                    height: 3,
                    backgroundColor: MUTED_LINE,
                  }}
                />
                <span>MA200</span>
              </div>
            )}
            {!chart.hasMa50 && !chart.hasMa200 && <span>omxsum.com</span>}
          </div>
        </div>
      </OgCanvas>
    ),
    imageOptions,
  );
}
