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
const CHART = { width: 1080, height: 260 };

const svDecimal = (value, digits = 1) =>
    Number(value).toLocaleString("sv-SE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Line + area for the visible closes, as a standalone SVG. Satori renders it
// through <img>, which handles gradients and paths that Satori's own SVG
// support does not.
// Mirrors --company-positive / --company-negative from the dark theme, which is
// the theme this card always renders in.
const POSITIVE = "#71ff86";
const NEGATIVE = "#ff6b66";

function chartDataUri(closes, positive) {
    const stroke = positive ? POSITIVE : NEGATIVE;
    const { width, height } = CHART;
    const pad = 10;

    if (closes.length < 2) {
        return `data:image/svg+xml;base64,${Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
        ).toString("base64")}`;
    }

    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const stepX = width / (closes.length - 1);
    const points = closes.map((close, index) => [
        index * stepX,
        pad + (1 - (close - min) / span) * (height - pad * 2),
    ]);

    const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${line} L${width} ${height} L0 ${height} Z`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${stroke}" stop-opacity="0.28"/>
                <stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="${stroke}" stop-opacity="0"/>
                <stop offset="12%" stop-color="${stroke}" stop-opacity="1"/>
                <stop offset="100%" stop-color="${stroke}" stop-opacity="1"/>
            </linearGradient>
        </defs>
        <path d="${area}" fill="url(#fill)"/>
        <path d="${line}" fill="none" stroke="url(#stroke)" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
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

                <div style={{ display: "flex", width: CHART.width, height: CHART.height }}>
                    <img src={chartDataUri(closes, positive)} width={CHART.width} height={CHART.height} alt="" />
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
