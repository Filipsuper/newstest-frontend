import { ImageResponse } from "next/og";

// The share card for a stock's move. Rendered as a route handler rather than an
// opengraph-image convention because it has to vary by ?range= — the share
// modal previews this exact URL, so what you see before sharing is the image
// that unfurls afterwards.

export const runtime = "nodejs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RANGES = {
    "6m": { label: "6 månader", sessions: 130 },
    "1y": { label: "1 år", sessions: 260 },
    "3y": { label: "3 år", sessions: 780 },
    "5y": { label: "5 år", sessions: 1300 },
};

const SIZE = { width: 1200, height: 630 };
// Plot plus the right-hand price gutter, matching the chart's YAxis width.
const CHART = { width: 1080, height: 268, axis: 62 };

// The dark theme's chart tokens — this card always renders dark.
const YELLOW = "#ffc43d";
const YELLOW_BRIGHT = "#fff3d0";
const VOLUME = "rgba(255, 196, 61, 0.11)";
const GRID = "rgba(199, 205, 218, 0.105)";
const MUTED = "#9297a3";
const POSITIVE = "#71ff86";
const NEGATIVE = "#ff6b66";

const svDecimal = (value, digits = 1) =>
    Number(value).toLocaleString("sv-SE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Round gridline values over [min, max], the way the chart's "auto" domain does.
function niceTicks(min, max, count = 4) {
    const span = (max - min) || 1;
    const rough = span / count;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough) * magnitude;
    const ticks = [];
    for (let value = Math.ceil(min / step) * step; value <= max; value += step) ticks.push(value);
    return ticks;
}

// The site's chart, redrawn as a standalone SVG: dotted grid, faint volume bars
// along the bottom, and the yellow price line whose gradient fades in from the
// left and brightens towards the end. Satori cannot run Recharts, so this is
// rasterised through <img> — which is also what makes gradients work.
function chartSvg(rows) {
    const width = CHART.width - CHART.axis;
    const { height } = CHART;
    const pad = 12;

    const closes = rows.map((row) => row.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const y = (close) => pad + (1 - (close - min) / span) * (height - pad * 2);
    const stepX = width / (rows.length - 1);

    // Volume shares the axis with the price, scaled to a quarter of the height
    // exactly like the chart's [0, max * 4] volume domain.
    const maxVolume = Math.max(...rows.map((row) => row.volume ?? 0)) || 1;
    const barWidth = Math.max(1, stepX * 0.7);
    const volumeBars = rows
        .map((row, index) => {
            const value = row.volume ?? 0;
            if (!value) return "";
            const barHeight = (value / (maxVolume * 4)) * height;
            return `<rect x="${(index * stepX - barWidth / 2).toFixed(1)}" y="${(height - barHeight).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${VOLUME}"/>`;
        })
        .join("");

    const horizontals = niceTicks(min, max)
        .map((value) => `<line x1="0" y1="${y(value).toFixed(1)}" x2="${width}" y2="${y(value).toFixed(1)}" stroke="${GRID}" stroke-width="1" stroke-dasharray="2 6"/>`)
        .join("");
    const verticals = Array.from({ length: 6 }, (_, index) => {
        const x = ((index + 1) / 7) * width;
        return `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${height}" stroke="${GRID}" stroke-width="1" stroke-dasharray="2 6"/>`;
    }).join("");

    const line = rows
        .map((row, index) => `${index === 0 ? "M" : "L"}${(index * stepX).toFixed(1)} ${y(row.close).toFixed(1)}`)
        .join(" ");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
            <linearGradient id="price" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="${YELLOW}" stop-opacity="0"/>
                <stop offset="22%" stop-color="${YELLOW}" stop-opacity="1"/>
                <stop offset="50%" stop-color="${YELLOW}" stop-opacity="1"/>
                <stop offset="90%" stop-color="${YELLOW_BRIGHT}" stop-opacity="1"/>
                <stop offset="100%" stop-color="${YELLOW}" stop-opacity="1"/>
            </linearGradient>
        </defs>
        ${horizontals}${verticals}${volumeBars}
        <path d="${line}" fill="none" stroke="url(#price)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;

    return {
        uri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
        labels: niceTicks(min, max).map((value) => ({ value, top: y(value) })),
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

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const symbol = String(searchParams.get("symbol") ?? "").toUpperCase().slice(0, 20);
    const rangeId = RANGES[searchParams.get("range")] ? searchParams.get("range") : "1y";
    const range = RANGES[rangeId];

    const data = symbol && /^[A-Z0-9.\-]{1,20}$/.test(symbol) ? await loadCompany(symbol).catch(() => null) : null;
    const profile = data?.summary?.profile;
    const quote = data?.summary?.quote;

    const name = profile?.name ?? symbol.replace(".ST", "").replaceAll("-", " ") ?? "Omxsum";
    const ticker = profile?.nativeSymbol ?? symbol.replace(".ST", "");

    const bars = (data?.chart?.bars ?? []).filter((bar) => bar?.close != null);
    const visible = bars.slice(Math.max(0, bars.length - range.sessions));
    const closes = visible.map((bar) => bar.close);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const returnPct = first && last ? ((last / first) - 1) * 100 : null;
    const positive = (returnPct ?? 0) >= 0;
    const accent = positive ? POSITIVE : NEGATIVE;

    // Nothing to plot (unknown symbol, or a listing too fresh to have history):
    // a branded card beats a card with an empty chart and a dash for a number.
    if (returnPct == null || closes.length < 2) {
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
                        gap: 18,
                        backgroundColor: "#101217",
                        color: "#f2f3f5",
                        fontFamily: "sans-serif",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <div style={{ display: "flex", width: 30, height: 30, borderRadius: 15, backgroundColor: "#ffc43d" }} />
                        <div style={{ display: "flex", fontSize: 64, fontWeight: 900, fontStyle: "italic", fontFamily: "serif" }}>
                            Omxsum
                        </div>
                    </div>
                    <div style={{ display: "flex", fontSize: 34, color: "#9297a3" }}>
                        Aktieöversikter för 870+ svenska aktier
                    </div>
                </div>
            ),
            { ...SIZE, headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
        );
    }

    const chart = chartSvg(visible);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    backgroundColor: "#101217",
                    color: "#f2f3f5",
                    padding: "54px 60px 44px",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", fontSize: 26, color: "#9297a3", marginBottom: 10 }}>
                            {ticker}
                            {profile?.segment ? `  ·  ${profile.segment.replaceAll("_", " ")}` : ""}
                        </div>
                        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: "-0.02em" }}>
                            {name.length > 28 ? `${name.slice(0, 27)}…` : name}
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ display: "flex", width: 22, height: 22, borderRadius: 11, backgroundColor: "#ffc43d" }} />
                        <div style={{ display: "flex", fontSize: 36, fontWeight: 900, fontStyle: "italic", fontFamily: "serif" }}>
                            Omxsum
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
                    <div style={{ display: "flex", fontSize: 112, fontWeight: 700, color: accent, lineHeight: 1 }}>
                        {returnPct == null ? "–" : `${returnPct > 0 ? "+" : ""}${svDecimal(returnPct)}%`}
                    </div>
                    <div style={{ display: "flex", fontSize: 32, color: "#9297a3", paddingBottom: 12 }}>
                        senaste {range.label.toLowerCase()}
                    </div>
                </div>

                <div style={{ display: "flex", position: "relative", width: CHART.width, height: CHART.height }}>
                    <img src={chart.uri} width={CHART.width - CHART.axis} height={CHART.height} alt="" />
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
                            {Number(label.value).toLocaleString("sv-SE", { maximumFractionDigits: 0 })}
                        </div>
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28 }}>
                    <div style={{ display: "flex", color: "#9297a3" }}>omxsum.com</div>
                    {quote?.price != null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <span style={{ color: "#9297a3" }}>Kurs</span>
                            <span style={{ fontWeight: 700 }}>{svDecimal(quote.price, 2)} kr</span>
                        </div>
                    )}
                </div>
            </div>
        ),
        {
            ...SIZE,
            headers: {
                "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=86400",
            },
        },
    );
}
