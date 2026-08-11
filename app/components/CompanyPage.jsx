"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiShare2, FiSliders } from "react-icons/fi";
import { FaLock, FaRegStar, FaScaleBalanced, FaStar } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";
import ShareStockModal from "../modals/ShareStockModal";
import { fetchCompanyIntraday, toggleWatchlist } from "../utils/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TABS = [
    { id: "overview", label: "Översikt" },
    { id: "financials", label: "Finansiellt" },
    { id: "estimates", label: "Estimat" },
    { id: "valuation", label: "Värdering" },
    { id: "news", label: "Nyheter & rapporter" },
    { id: "calendar", label: "Kalender" },
];

const LINE_FADES = [
    ["company-line-fade-yellow", "--company-yellow", "--company-yellow-bright"],
    ["company-line-fade-blue", "--company-blue", "--company-blue-bright"],
    ["company-line-fade-muted", "--company-muted-line", "--company-muted-line-bright"],
];

const RANGES = [
    { id: "1d", label: "1 dag", intraday: true },
    { id: "6m", label: "6 mån", sessions: 130 },
    { id: "1y", label: "1 år", sessions: 260 },
    { id: "3y", label: "3 år", sessions: 780 },
    { id: "5y", label: "5 år", sessions: 1300 },
];

const money = (value, currency = "SEK") => {
    if (value == null || !Number.isFinite(Number(value))) return "Saknas";
    const number = Number(value);
    const abs = Math.abs(number);
    if (abs >= 1e9) return `${(number / 1e9).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} md ${currency}`;
    if (abs >= 1e6) return `${(number / 1e6).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} M ${currency}`;
    return `${number.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} ${currency}`;
};

const number = (value, digits = 1) =>
    value == null || !Number.isFinite(Number(value))
        ? "Saknas"
        : Number(value).toLocaleString("sv-SE", { maximumFractionDigits: digits });

const pct = (value) => {
    if (value == null || !Number.isFinite(Number(value))) return "–";
    const parsed = Number(value);
    return `${parsed > 0 ? "+" : ""}${parsed.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

const svDate = (value, compact = false) => {
    if (!value) return "Datum saknas";
    return new Date(value).toLocaleDateString("sv-SE", compact
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "long", year: "numeric" });
};

const svDateTime = (value) => value
    ? new Date(value).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Tidpunkt saknas";

const svTime = (value) => value
    ? new Date(value).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
    : "–";

const stockholmDay = (value) => new Date(value).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

const periodLabel = (period) => {
    if (!period) return "Period saknas";
    if (period.estimate) return `${period.periodLabel ?? period.fiscalPeriod ?? period.periodEnd}E`;
    if (period.frequency === "ttm") return `${period.fiscalPeriod?.replace("-TTM", "") ?? period.periodEnd} · R12`;
    return period.fiscalPeriod ?? period.fiscalYear ?? period.periodEnd;
};

// Matches the slug scheme the article route expects: spaces become hyphens,
// existing hyphens become underscores.
const articleSlug = (title = "") => title.replaceAll("-", "_").replaceAll(" ", "-");

const compactAmount = new Intl.NumberFormat("sv-SE", {
    notation: "compact",
    maximumFractionDigits: 1,
});

function estimatePeriodFromSnapshot(snapshot) {
    if (!snapshot?.metrics?.length) return null;
    const eligible = snapshot.metrics.filter((metric) => !metric.scope && Number.isFinite(Number(metric.amount)));
    const amountMetric = (...keys) => keys
        .map((key) => eligible.find((metric) => metric.key === key && metric.unit !== "%" && metric.currency))
        .find(Boolean) ?? null;
    const marginMetric = (...keys) => keys
        .map((key) => eligible.find((metric) => metric.key === key && (metric.unit === "%" || /margin/i.test(metric.label ?? ""))))
        .find(Boolean) ?? eligible.find((metric) => /^ebit/.test(metric.key ?? "") && /margin/i.test(metric.label ?? "")) ?? null;

    const revenue = amountMetric("revenue");
    const ebitReported = amountMetric("ebit");
    const ebitAdjusted = amountMetric("ebit_adjusted");
    const ebitaReported = amountMetric("ebita");
    const ebitaAdjusted = amountMetric("ebita_adjusted");
    const ebitdaReported = amountMetric("ebitda");
    const ebitdaAdjusted = amountMetric("ebitda_adjusted");
    const marginReported = marginMetric("ebit_margin");
    const marginAdjusted = marginMetric("ebit_margin_adjusted", "ebit_adjusted");
    const selectedEbit = ebitReported ?? ebitAdjusted;
    const selectedEbita = ebitaReported ?? ebitaAdjusted;
    const selectedEbitda = ebitdaReported ?? ebitdaAdjusted;
    const selectedMargin = marginReported ?? marginAdjusted;
    if (![revenue, selectedEbit, selectedEbita, selectedEbitda, selectedMargin].some(Boolean)) return null;

    return {
        periodKey: snapshot.snapshotId,
        periodEnd: snapshot.reportDate ?? snapshot.publishedAt,
        fiscalPeriod: snapshot.fiscalPeriod,
        periodLabel: snapshot.periodLabel,
        frequency: "quarterly",
        dataType: "estimate",
        estimate: true,
        revenue: revenue?.amount ?? null,
        ebit: selectedEbit?.amount ?? null,
        ebita: selectedEbita?.amount ?? null,
        ebitda: selectedEbitda?.amount ?? null,
        ebitMarginPct: selectedMargin?.amount ?? null,
        estimateAdjusted: {
            ebit: !ebitReported && Boolean(ebitAdjusted),
            ebita: !ebitaReported && Boolean(ebitaAdjusted),
            ebitda: !ebitdaReported && Boolean(ebitdaAdjusted),
            ebitMarginPct: !marginReported && Boolean(marginAdjusted),
        },
        estimateSource: {
            ...snapshot.source,
            contributors: snapshot.contributors,
            publishedAt: snapshot.publishedAt,
        },
    };
}

function statementParagraphs(text) {
    return String(text ?? "")
        .trim()
        .replace(/([A-Za-zÅÄÖåäö])-\s*\n\s*([a-zåäö])/g, "$1$2")
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean);
}

function movingAverage(rows, window) {
    let sum = 0;
    return rows.map((row, index) => {
        sum += row.close ?? 0;
        if (index >= window) sum -= rows[index - window].close ?? 0;
        return index >= window - 1 ? sum / window : null;
    });
}

// Recharts left-anchors the ticks of a right-side axis, leaving the rest of the
// axis box as dead space. Anchor them to the axis' right edge instead.
function RightAxisTick({ x, y, width, payload, format }) {
    return (
        <text x={x + width - 2} y={y} dy="0.32em" textAnchor="end" className="recharts-cartesian-axis-tick-value">
            {format(payload.value)}
        </text>
    );
}

function LiveEndpointDot({ cx, cy }) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    return (
        <g className="company-live-endpoint" aria-hidden="true">
            <circle className="company-live-endpoint-pulse" cx={cx} cy={cy} r="7" />
            <circle className="company-live-endpoint-core" cx={cx} cy={cy} r="3.2" />
        </g>
    );
}

function ChartTooltip({ active, payload, label, compare, intraday }) {
    if (!active || !payload?.length) return null;
    const values = Object.fromEntries(payload.map((entry) => [entry.dataKey, entry.value]));
    return (
        <div className="company-tooltip">
            <strong>{intraday ? svDateTime(label) : svDate(label)}</strong>
            {intraday ? (
                <span>Kurs {number(values.currentPrice ?? values.previousPrice, 2)} kr</span>
            ) : compare ? (
                <>
                    <span>Aktien {pct(values.returnPct)}</span>
                    <span>OMXSPI {pct(values.benchmarkPct)}</span>
                </>
            ) : (
                <>
                    <span>Kurs {number(values.close, 2)} kr</span>
                    {values.ma50 != null && <span>MA50 {number(values.ma50, 2)} kr</span>}
                    {values.ma200 != null && <span>MA200 {number(values.ma200, 2)} kr</span>}
                    {values.volume != null && <span>Volym {Number(values.volume).toLocaleString("sv-SE")}</span>}
                </>
            )}
        </div>
    );
}

function WatchlistButton({ symbol }) {
    const { user, isGuestUser, refreshUser } = useAuthContext();
    const [busy, setBusy] = useState(false);

    if (!user || isGuestUser) return null;

    const starred = (user.watchlist ?? []).includes(symbol);

    const handleToggle = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await toggleWatchlist(symbol);
            await refreshUser();
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className={`company-watchlist ${starred ? "active" : ""}`}
            onClick={handleToggle}
            disabled={busy}
            aria-label={starred ? "Ta bort från bevakningslistan" : "Lägg till i bevakningslistan"}
            title={starred ? "Ta bort från Mina aktier" : "Lägg till i Mina aktier"}
        >
            {starred ? <FaStar /> : <FaRegStar />}
        </button>
    );
}

// Opens the share sheet for the move the reader is actually looking at: the
// selected period and its return.
function ShareMoveButton({ symbol, companyName, range, ma50, ma200 }) {
    const { openModal } = useModal();

    return (
        <button
            className="company-icon-control"
            aria-label="Dela aktien"
            title="Dela aktien"
            onClick={() => openModal(
                <ShareStockModal
                    symbol={symbol}
                    companyName={companyName}
                    rangeId={range}
                    ma50={ma50}
                    ma200={ma200}
                />,
            )}
        >
            <FiShare2 />
        </button>
    );
}

function CompanyChart({ chart, companyName, summary, symbol, initialRange, initialMovingAverages = "" }) {
    const [range, setRange] = useState(
        RANGES.some((option) => option.id === initialRange) ? initialRange : "1y",
    );
    const [compare, setCompare] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const initialMaSelection = String(initialMovingAverages).split(",");
    const [ma50, setMa50] = useState(initialMaSelection.includes("50"));
    const [ma200, setMa200] = useState(initialMaSelection.includes("200"));
    const [intraday, setIntraday] = useState(null);
    const [intradayError, setIntradayError] = useState("");
    const [intradayLive, setIntradayLive] = useState(false);
    const lastLiveTickRef = useRef(null);

    const dailyData = useMemo(() => {
        const allRows = chart?.bars ?? [];
        const selectedRange = RANGES.find((item) => item.id === range && !item.intraday) ?? RANGES[2];
        const ma50Values = movingAverage(allRows, 50);
        const ma200Values = movingAverage(allRows, 200);
        const benchmark = new Map((chart?.benchmark?.bars ?? []).map((row) => [row.date, row.close]));
        const start = Math.max(0, allRows.length - selectedRange.sessions);
        const visible = allRows.slice(start);
        const firstClose = visible.find((row) => row.close != null)?.close;
        const firstBenchmark = visible.map((row) => benchmark.get(row.date)).find((value) => value != null);
        return visible.map((row, visibleIndex) => {
            const index = start + visibleIndex;
            const benchmarkClose = benchmark.get(row.date);
            return {
                ...row,
                ma50: ma50Values[index],
                ma200: ma200Values[index],
                returnPct: firstClose ? ((row.close / firstClose) - 1) * 100 : null,
                benchmarkPct: firstBenchmark && benchmarkClose
                    ? ((benchmarkClose / firstBenchmark) - 1) * 100
                    : null,
            };
        });
    }, [chart, range]);

    useEffect(() => {
        if (range !== "1d") {
            setIntradayLive(false);
            return undefined;
        }

        let active = true;
        let source;
        let staleTimer;

        const openStream = () => {
            if (!active) return;
            source = new EventSource(`${API_URL}/feed/company/${encodeURIComponent(symbol)}/stream`);

            source.addEventListener("quote", (event) => {
                if (!active) return;
                try {
                    const tick = JSON.parse(event.data);
                    if (tick.symbol !== symbol || !Number.isFinite(Number(tick.price)) || !Number.isFinite(Number(tick.ts))) return;
                    const tickTime = Number(tick.ts);
                    const tickDay = stockholmDay(tickTime);
                    const bucketTime = Math.floor(tickTime / 10_000) * 10_000;
                    lastLiveTickRef.current = tickTime;
                    setIntradayLive(tick.freshStream === true && Math.abs(Date.now() - tickTime) <= 90_000);
                    setIntraday((current) => {
                        if (!current) return current;
                        let previous = current.previous ?? [];
                        let currentBars = current.current ?? [];
                        let previousClose = current.previousClose;
                        let sessionDate = current.sessionDate;
                        let previousSessionDate = current.previousSessionDate;

                        if (sessionDate && tickDay !== sessionDate) {
                            previous = currentBars.slice(Math.floor(currentBars.length * 0.75));
                            previousClose = currentBars.at(-1)?.close ?? previousClose;
                            previousSessionDate = sessionDate;
                            sessionDate = tickDay;
                            currentBars = [];
                        }

                        const nextPoint = { time: bucketTime, close: Number(tick.price), volume: null };
                        const latest = currentBars.at(-1);
                        const nextBars = latest?.time === bucketTime
                            ? [...currentBars.slice(0, -1), nextPoint]
                            : [...currentBars, nextPoint].slice(-700);
                        return {
                            ...current,
                            sessionDate: sessionDate ?? tickDay,
                            previousSessionDate,
                            previousClose,
                            previous,
                            current: nextBars,
                            quote: {
                                ...current.quote,
                                price: Number(tick.price),
                                change: Number.isFinite(Number(tick.change)) ? Number(tick.change) : current.quote?.change,
                                changePct: Number.isFinite(Number(tick.changePct)) ? Number(tick.changePct) : current.quote?.changePct,
                                quoteTime: tickTime,
                                fresh: tick.freshStream === true,
                            },
                        };
                    });
                } catch {
                    // Ignore malformed stream frames; EventSource remains open.
                }
            });

            source.addEventListener("status", (event) => {
                try {
                    if (JSON.parse(event.data)?.connected === false) setIntradayLive(false);
                } catch {
                    // Ignore malformed status frames.
                }
            });
            source.onerror = () => setIntradayLive(false);
            staleTimer = setInterval(() => {
                if (!lastLiveTickRef.current || Date.now() - lastLiveTickRef.current > 90_000) setIntradayLive(false);
            }, 15_000);
        };

        setIntradayError("");
        setIntraday(null);
        lastLiveTickRef.current = null;
        fetchCompanyIntraday(symbol)
            .then((payload) => {
                if (active) setIntraday(payload);
            })
            .catch(() => {
                if (active) setIntradayError("Kunde inte hämta intradagsdata.");
            })
            .finally(openStream);

        return () => {
            active = false;
            source?.close();
            clearInterval(staleTimer);
        };
    }, [range, symbol]);

    const intradayData = useMemo(() => [
        ...(intraday?.previous ?? []).map((row) => ({
            ...row,
            date: row.time,
            session: "previous",
            previousPrice: row.close,
            currentPrice: null,
        })),
        ...(intraday?.current ?? []).map((row) => ({
            ...row,
            date: row.time,
            session: "current",
            previousPrice: null,
            currentPrice: row.close,
        })),
    ], [intraday]);

    const isIntraday = range === "1d";
    const data = isIntraday ? intradayData : dailyData;
    const chartCompare = !isIntraday && compare;
    const firstIntradayPoint = intradayData.find((row) => row.currentPrice != null);
    const lastIntradayPoint = intradayData.findLast((row) => row.currentPrice != null);
    const profile = summary.profile;
    const quote = isIntraday && intraday?.quote ? { ...summary.quote, ...intraday.quote } : summary.quote;
    const loadingIntraday = isIntraday && !data.length;
    const placeholderPrice = Number(quote?.price ?? dailyData.at(-1)?.close ?? 1);
    const quoteTimeValue = quote?.quoteTime ?? quote?.dataAsOf ?? dailyData.at(-1)?.date;
    const quoteTime = typeof quoteTimeValue === "number" ? quoteTimeValue : Date.parse(quoteTimeValue);
    const placeholderEnd = Number.isFinite(quoteTime) ? quoteTime : 0;
    const placeholderData = Array.from({ length: 5 }, (_, index) => ({
        date: placeholderEnd - (4 - index) * 2 * 60 * 60 * 1000,
        session: "current",
        currentPrice: placeholderPrice,
        previousPrice: null,
        volume: null,
    }));
    const renderedData = loadingIntraday ? placeholderData : data;
    const intradayPrices = [
        intraday?.previousClose,
        ...intradayData.map((row) => row.previousPrice ?? row.currentPrice),
    ].map(Number).filter(Number.isFinite);
    const intradayMinimum = intradayPrices.length ? Math.min(...intradayPrices) : placeholderPrice;
    const intradayMaximum = intradayPrices.length ? Math.max(...intradayPrices) : placeholderPrice;
    const intradayPadding = Math.max(
        (intradayMaximum - intradayMinimum) * 0.08,
        Math.max(Math.abs(intradayMinimum), Math.abs(intradayMaximum), 1) * 0.004,
    );
    const intradayPriceDomain = [
        intradayMinimum - intradayPadding,
        intradayMaximum + intradayPadding,
    ];

    if (!dailyData.length) {
        return <p className="company-empty">Ingen historisk kursdata är tillgänglig ännu.</p>;
    }

    const changeTone = quote?.changePct == null ? "neutral" : quote.changePct >= 0 ? "positive" : "negative";

    return (
        <section className="company-chart-section" aria-labelledby="price-heading">
            <div className="flex flex-col company-chart-heading">
                {/* <div>
                    <p className="company-eyebrow">Historisk utvecklin g</p>
                    <h2 id="price-heading">Hur har aktien utvecklats?</h2>
                </div> */}
                <header className="w-full company-header">
                    <div className="company-identity">
                        <div className="company-symbol-row">
                            {/* <span>{profile.nativeSymbol ?? symbol.replace(".ST", "")}</span> */}
                            {/* {profile.market && <small>{profile.market}</small>} */}
                            {profile.segment && <small className="font-bold">{profile.segment.replaceAll("_", " ")}</small>}
                            <div className="text-text-muted">•</div>
                            <h1 className="font-serif "> {profile.name ?? symbol}</h1>
                            {/* <small className="">{profile.sector ?? "Sektor saknas"} - {profile.industry ? `${profile.industry}` : ""}</small> */}
                            <WatchlistButton symbol={symbol} />
                        </div>
                        <div className="company-symbol-row" />
                        <div className="company-quote gap-4">
                            <strong>{quote?.price == null ? "Kurs saknas" : `${number(quote.price, 2)} kr`}</strong>
                            <span className={changeTone}>{quote?.change == null ? "–" : `${quote.change > 0 ? "+" : ""}${number(quote.change, 2)} kr · ${pct(quote.changePct)}`}</span>
                        </div>
                        {/* <div className="company-title-row">
                            <h1>{profile.name ?? symbol}</h1>
                            <WatchlistButton symbol={symbol} />
                        </div> */}
                        
                    </div>
                    
                </header>
                <div className="flex flex-row w-full justify-between">
                    <div className="company-range-row" aria-label="Välj tidsperiod">
                        {RANGES.map((option) => (
                            <button
                                key={option.id}
                                disabled={!option.intraday && (chart?.bars?.length ?? 0) < Math.min(option.sessions * 0.75, option.sessions - 15)}
                                className={range === option.id ? "company-range-active" : ""}
                                onClick={() => setRange(option.id)}
                            >
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="company-chart-actions max-w-fit">
                        <ShareMoveButton
                            symbol={symbol}
                            companyName={companyName}
                            range={range}
                            ma50={!isIntraday && ma50}
                            ma200={!isIntraday && ma200}
                        />
                        {!isIntraday && (
                            <button
                                className="company-control company-icon-control"
                                onClick={() => setCompare((value) => !value)}
                            >
                                <FaScaleBalanced/>
                            </button>
                        )}
                        {!isIntraday && (
                            <div className="company-settings-wrap">
                                <button
                                    className="company-icon-control"
                                    aria-label="Diagraminställningar"
                                    aria-expanded={settingsOpen}
                                    onClick={() => setSettingsOpen((value) => !value)}
                                >
                                    <FiSliders />
                                </button>
                                {settingsOpen && (
                                    <div className="company-chart-settings">
                                        <label><input type="checkbox" checked={ma50} onChange={(event) => setMa50(event.target.checked)} /> MA50</label>
                                        <label><input type="checkbox" checked={ma200} onChange={(event) => setMa200(event.target.checked)} /> MA200</label>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                 
            </div>
            <div className={`company-chart ${loadingIntraday ? "company-chart-is-loading" : ""}`} role="img" aria-label={`Kursutveckling för ${companyName}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={renderedData} margin={{ top: 14, right: 0, bottom: 4, left: 4 }}>
                        <defs>
                            {LINE_FADES.map(([id, color, bright]) => (
                                <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" style={{ stopColor: `var(${color})`, stopOpacity: 0 }} />
                                    <stop offset="22%" style={{ stopColor: `var(${color})`, stopOpacity: 1 }} />
                                    
                                    <stop offset="50%" style={{ stopColor: `var(${color})`, stopOpacity: 1 }} />
                                    <stop offset="90%" style={{ stopColor: `var(${bright})`, stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: `var(${color})`, stopOpacity: 1 }} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid stroke="var(--company-grid-line)" strokeDasharray="2 6" />
                        <XAxis dataKey="date" tickFormatter={(value) => isIntraday ? svTime(value) : svDate(value, true)} minTickGap={58} axisLine={false} tickLine={false} />
                        <YAxis
                            yAxisId="price"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tickSize={0}
                            tickMargin={0}
                            width={54}
                            domain={isIntraday ? intradayPriceDomain : ["auto", "auto"]}
                            allowDataOverflow={isIntraday}
                            tick={<RightAxisTick format={(value) => chartCompare ? `${value.toFixed(0)}%` : number(value, 0)} />}
                        />
                        {!chartCompare && <YAxis yAxisId="volume" hide domain={[0, (maximum) => maximum * 4]} />}
                        <Tooltip content={(props) => loadingIntraday ? null : <ChartTooltip {...props} compare={chartCompare} intraday={isIntraday} />} />
                        {!chartCompare && (
                            <Bar yAxisId="volume" dataKey="volume" fill="var(--company-volume)" isAnimationActive={false}>
                                {isIntraday && renderedData.map((row) => (
                                    <Cell key={`${row.session}-${row.date}`} fill={row.session === "previous" ? "var(--company-muted-volume)" : "var(--company-volume)"} />
                                ))}
                            </Bar>
                        )}
                        {isIntraday && !loadingIntraday && firstIntradayPoint && (
                            <ReferenceLine yAxisId="price" x={firstIntradayPoint.date} stroke="var(--company-muted-line)" strokeOpacity={0.55} strokeDasharray="4 6" />
                        )}
                        {isIntraday && !loadingIntraday && (
                            <Line yAxisId="price" type="monotone" dataKey="previousPrice" stroke="var(--company-muted-line)" strokeOpacity={0.62} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
                        )}
                        {isIntraday && !loadingIntraday && (
                            <Line yAxisId="price" type="monotone" dataKey="currentPrice" stroke="url(#company-line-fade-yellow)" strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls={false} />
                        )}
                        {isIntraday && !loadingIntraday && intradayLive && lastIntradayPoint && (
                            <ReferenceDot yAxisId="price" x={lastIntradayPoint.date} y={lastIntradayPoint.currentPrice} isFront shape={(props) => <LiveEndpointDot {...props} />} />
                        )}
                        {!isIntraday && (
                            <Line
                                yAxisId="price"
                                type="monotone"
                                dataKey={chartCompare ? "returnPct" : "close"}
                                stroke="url(#company-line-fade-yellow)"
                                strokeWidth={2.2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        )}
                        {chartCompare && (
                            <Line yAxisId="price" type="monotone" dataKey="benchmarkPct" stroke="url(#company-line-fade-blue)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                        )}
                        {!isIntraday && !chartCompare && ma50 && (
                            <Line yAxisId="price" type="monotone" dataKey="ma50" stroke="url(#company-line-fade-blue)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                        )}
                        {!isIntraday && !chartCompare && ma200 && (
                            <Line yAxisId="price" type="monotone" dataKey="ma200" stroke="url(#company-line-fade-muted)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
                {isIntraday && (
                    <div
                        className={`company-chart-loading ${loadingIntraday ? "company-chart-loading-visible" : ""} ${intradayError ? "company-chart-loading-error" : ""}`}
                        aria-hidden={!loadingIntraday}
                    >
                        {!intradayError && <span className="company-chart-loading-pulse" />}
                        <span>{intradayError || "Hämtar dagens kurs"}</span>
                    </div>
                )}
            </div>
            <div className="company-chart-legend">
                <span><i className="legend-yellow" />{companyName}</span>
                {chartCompare && <span><i className="legend-blue" />OMXSPI</span>}
                {!isIntraday && !chartCompare && ma50 && <span><i className="legend-blue" />MA50</span>}
                {!isIntraday && !chartCompare && ma200 && <span><i className="legend-muted" />MA200</span>}
            </div>
        </section>
    );
}

function Metric({ label, value, detail }) {
    return (
        <div className="company-metric">
            <span>{label}</span>
            <strong>{value}</strong>
            {detail && <small>{detail}</small>}
        </div>
    );
}

function FinancialSnapshot({ highlights, onSelectTab }) {
    const period = highlights?.ttm ?? highlights?.annual ?? highlights?.quarterly;
    if (!period) return <p className="company-empty">Finansiella nyckeltal saknas för bolaget.</p>;
    const currency = highlights?.currency ?? "SEK";
    return (
        <section className="company-section" aria-labelledby="financial-question">
            <div className="company-section-heading">
                <div>
                    <p className="company-eyebrow">Finansiell överblick</p>
                    <h2 id="financial-question">Vad tjänar bolaget?</h2>
                </div>
                <button type="button" className="company-text-link" onClick={() => onSelectTab("financials")}>Visa finansiellt <FiChevronRight /></button>
            </div>
            <div className="company-metric-grid">
                <Metric label="Omsättning" value={money(period.revenue, currency)} detail={periodLabel(period)} />
                <Metric label="EBIT" value={money(period.ebit, currency)} detail={`${number(period.ebitMarginPct)}% marginal`} />
                <Metric label="Nettoresultat" value={money(period.netIncome, currency)} />
                <Metric label="Fritt kassaflöde" value={money(period.freeCashFlow, currency)} />
                <Metric label="Nettoskuld" value={money(period.netDebt, currency)} />
                <Metric label="Nettoskuld / EBITDA" value={period.netDebtToEbitda == null ? "Saknas" : `${number(period.netDebtToEbitda, 2)}×`} />
            </div>
            {/* <p className="company-source">Källa: {highlights?.source ?? "Yahoo"} · Uppdaterad {svDate(highlights?.dataAsOf)}</p> */}
        </section>
    );
}

function CalendarPreview({ calendar, onSelectTab }) {
    const earnings = calendar?.earningsDates?.[0] ?? calendar?.events?.find((event) => event.type === "earnings")?.date;
    return (
        <section className="company-context-section" aria-labelledby="calendar-preview-heading">
            <p className="company-eyebrow">Nästa händelse</p>
            <h2 id="calendar-preview-heading">{earnings ? svDate(earnings) : "Inget datum bekräftat"}</h2>
            <p>{earnings ? "Nästa rapportdatum enligt tillgänglig bolagskalender." : "Vi visar datumet när bolaget eller en verifierad källa publicerar det."}</p>
            <button type="button" className="company-text-link" onClick={() => onSelectTab("calendar")}>Öppna kalendern <FiChevronRight /></button>
        </section>
    );
}

const storyUrl = (story) => story.primarySource?.url ?? story.sources?.find((source) => source.url)?.url ?? null;

function NewsList({ news, compact = false }) {
    if (!news?.length) return <p className="company-empty">Inga bolagsspecifika nyheter finns ännu.</p>;
    return (
        <div className="company-news-list">
            {news.slice(0, compact ? 3 : 8).map((story) => {
                const url = storyUrl(story);
                const body = (
                    <>
                        <div className="company-news-meta">
                            <time>{svDate(story.publishedAt, true)}</time>
                            {(story.tags ?? []).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                        </div>
                        <h3>{story.headline}{url && <FiExternalLink />}</h3>
                        {!compact && story.summary && <p>{story.summary}</p>}
                    </>
                );
                return (
                    <article key={story.id} className={`company-news-item${url ? " company-news-linked" : ""}`}>
                        {url
                            ? <a href={url} target="_blank" rel="noreferrer">{body}</a>
                            : body}
                    </article>
                );
            })}
        </div>
    );
}

// The letters that talked about this company — the way back into the editorial
// side of the site from a stock page.
function MentionsList({ mentions, companyName }) {
    if (!mentions?.length) return null;
    return (
        <section className="company-context-section" aria-labelledby="company-mentions-heading">
            <p className="company-eyebrow">I breven</p>
            <h2 id="company-mentions-heading">Nämns i breven</h2>
            <div className="company-mentions-list">
                {mentions.map((item) => (
                    <Link key={item.id} href={`/article/${articleSlug(item.title)}`}>
                        <time>{svDate(item.createdAt, true)}</time>
                        <span>{item.title}</span>
                        <small>{item.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet"}</small>
                    </Link>
                ))}
            </div>
            <p className="company-source">Sök efter {companyName} i alla brev via <Link className="company-text-link" href="/alla-nyhetsbrev">arkivet <FiChevronRight /></Link></p>
        </section>
    );
}

function ExpandableText({ text, className = "", lines = 6 }) {
    const [expanded, setExpanded] = useState(false);
    const [clipped, setClipped] = useState(false);
    const textRef = useRef(null);

    useEffect(() => {
        const node = textRef.current;
        if (!node || expanded) return;
        const measure = () => setClipped(node.scrollHeight > node.clientHeight + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [text, expanded, lines]);

    return (
        <>
            <p
                ref={textRef}
                className={`${className} ${expanded ? "" : "company-clamp"}`.trim()}
                style={expanded ? undefined : { "--company-clamp-lines": lines }}
            >
                {text}
            </p>
            {clipped && (
                <button className="company-readmore" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                    {expanded ? "Visa mindre" : "Läs mer"}
                </button>
            )}
        </>
    );
}

function OverviewTab({ data, mentions = [], onSelectTab }) {
    const { summary, chart, news } = data;
    return (
        <>
            {/* <CompanyChart chart={chart} companyName={summary.profile.name ?? summary.symbol} /> */}
            <div className="company-overview-layout">
                <div className="company-main-column">
                    <section className="company-section" aria-labelledby="company-question">
                        <p className="company-eyebrow">Bolaget i korthet</p>
                        <h2 id="company-question">Vad gör bolaget?</h2>
                        <ExpandableText className="company-description" text={summary.profile.description || "Bolagsbeskrivning saknas ännu."} />
                        <dl className="company-facts">
                            {summary.profile.sector && <><dt>Sektor</dt><dd>{summary.profile.sector}</dd></>}
                            {summary.profile.industry && <><dt>Bransch</dt><dd>{summary.profile.industry}</dd></>}
                            {summary.profile.employees && <><dt>Anställda</dt><dd>{Number(summary.profile.employees).toLocaleString("sv-SE")}</dd></>}
                            {summary.profile.website && <><dt>Webbplats</dt><dd><a href={summary.profile.website} target="_blank" rel="noreferrer">Besök bolaget <FiExternalLink /></a></dd></>}
                        </dl>
                    </section>
                    <FinancialSnapshot highlights={summary.financialHighlights} onSelectTab={onSelectTab} />
                </div>
                <aside className="company-context-column">
                    <CalendarPreview calendar={summary.calendar} onSelectTab={onSelectTab} />
                    <section className="company-context-section" aria-labelledby="news-preview-heading">
                        <div className="company-section-heading">
                            <div>
                                <p className="company-eyebrow">Senaste bolagsnytt</p>
                                <h2 id="news-preview-heading">Vad har hänt?</h2>
                            </div>
                        </div>
                        <NewsList news={news} compact />
                        <button type="button" className="company-text-link" onClick={() => onSelectTab("news")}>Alla nyheter <FiChevronRight /></button>
                    </section>
                    <MentionsList mentions={mentions} companyName={summary.profile.name ?? summary.symbol} />
                </aside>
            </div>
        </>
    );
}

const FINANCIAL_SERIES = [
    { key: "revenue", label: "Omsättning", color: "var(--company-fin-revenue)" },
    { key: "ebit", label: "EBIT", color: "var(--company-fin-ebit)" },
    { key: "ebita", label: "EBITA", color: "var(--company-fin-ebita)" },
    { key: "ebitda", label: "EBITDA", color: "var(--company-fin-ebitda)" },
];

function FinancialChartTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    return (
        <div className="company-tooltip company-financial-tooltip">
            <div className="company-financial-tooltip-title">
                <strong>{label}</strong>
                {point.estimate && <span>ESTIMAT</span>}
            </div>
            {FINANCIAL_SERIES.filter((series) => point[series.key] != null).map((series) => (
                <div key={series.key}>
                    <span style={{ color: series.color }}>{series.label}</span>
                    <strong>{money(point[series.key], currency)}</strong>
                </div>
            ))}
            {point.ebitMarginPct != null && <div><span>EBIT-marginal</span><strong>{number(point.ebitMarginPct)}%</strong></div>}
        </div>
    );
}

function FinancialDevelopmentChart({ periods, currency }) {
    const id = useId().replace(/[^a-z0-9]/gi, "");
    const data = periods.map((period) => ({ ...period, label: periodLabel(period) }));
    const series = FINANCIAL_SERIES.filter((candidate) => periods.some((period) => period[candidate.key] != null));
    return (
        <div className="company-financial-visual">
            <div className="company-financial-legend" aria-hidden="true">
                {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
                {periods.some((period) => period.ebitMarginPct != null) && <span><i className="company-margin-line" />EBIT-marginal</span>}
                {periods.some((period) => period.estimate) && <span><i className="company-estimate-key" />Estimat</span>}
            </div>
            <div className="company-financial-chart" role="img" aria-label="Omsättning, rörelseresultat och EBIT-marginal per period">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%" barGap={0}>
                        <defs>
                            {series.map((item) => (
                                <pattern key={item.key} id={`estimate-${item.key}-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                    <rect width="7" height="7" fill="var(--company-estimate-base)" />
                                    <line x1="0" y1="0" x2="0" y2="7" stroke={item.color} strokeWidth="2" />
                                </pattern>
                            ))}
                        </defs>
                        <XAxis dataKey="label" axisLine={{ stroke: "var(--company-grid-line)" }} tickLine={false} minTickGap={20} />
                        <YAxis yAxisId="amount" axisLine={false} tickLine={false} tickFormatter={(value) => compactAmount.format(value)} width={58} />
                        <YAxis yAxisId="margin" orientation="right" axisLine={false} tickLine={false} tickFormatter={(value) => `${number(value)}%`} width={52} domain={["auto", "auto"]} />
                        <Tooltip content={(props) => <FinancialChartTooltip {...props} currency={currency} />} cursor={{ fill: "var(--company-chart-cursor)" }} />
                        {series.map((item) => (
                            <Bar key={item.key} yAxisId="amount" dataKey={item.key} fill={item.color} maxBarSize={42} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                                {data.map((point) => (
                                    <Cell
                                        key={`${point.periodKey ?? point.periodEnd}-${item.key}`}
                                        fill={point.estimate ? `url(#estimate-${item.key}-${id})` : item.color}
                                        stroke={point.estimate ? item.color : "none"}
                                    />
                                ))}
                            </Bar>
                        ))}
                        <Line yAxisId="margin" type="monotone" dataKey="ebitMarginPct" stroke="var(--company-fin-margin)" strokeWidth={2.3} dot={{ r: 3, fill: "var(--company-fin-margin)", strokeWidth: 0 }} connectNulls isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function ManagementComment({ comment, latestReport }) {
    if (!comment) {
        if (!latestReport) return null;
        return <p className="company-ceo-pending">Inget VD-ord</p>;
    }
    const summary = comment.summary;
    const isComment = comment.type === "ceo_comment";
    const sourceUrl = comment.source?.releaseUrl ?? comment.source?.url;
    const paragraphs = statementParagraphs(comment.text);
    return (
        <section className="company-ceo-section" aria-labelledby="company-ceo-heading">
            <div className="company-ceo-heading">
                <div>
                    <p className="company-eyebrow">{isComment ? "VD-kommentar" : "VD-ord"} · {comment.fiscalPeriod ?? comment.periodLabel ?? "senaste rapport"}</p>
                    <h3 id="company-ceo-heading">Ledningens bild av läget</h3>
                </div>
                <time>{svDate(comment.publishedAt)}</time>
            </div>
            {summary ? (
                <>
                    <p className="company-ceo-lead">{summary.summary}</p>
                    {summary.noMeaningfulUpdate && <p className="company-ceo-no-update">Ingen tydlig ny förändring i ledningens budskap.</p>}
                    <div className="company-ceo-columns">
                        {summary.outlook?.length > 0 && (
                            <div><h4>Utsikter</h4><ul>{summary.outlook.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                        )}
                        {summary.changesAndRisks?.length > 0 && (
                            <div><h4>Förändringar och risker</h4><ul>{summary.changesAndRisks.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                        )}
                    </div>
                    {summary.keyFigures?.length > 0 && (
                        <div className="company-ceo-keyfigures">
                            {summary.keyFigures.slice(0, 5).map((item, index) => (
                                <div key={`${item.label}-${index}`}><span>{item.label}</span><strong>{item.value}</strong>{item.context && <small>{item.context}</small>}</div>
                            ))}
                        </div>
                    )}
                    <p className="company-ceo-ai-note">AI-sammanfattning från det källbelagda {isComment ? "VD-uttalandet" : "VD-ordet"}. Kontrollera väsentliga detaljer i originaltexten.</p>
                </>
            ) : <p className="company-ceo-pending">Sammanfattningen förbereds. Originaltexten finns tillgänglig nedan.</p>}
            {paragraphs.length > 0 && (
                <details className="company-ceo-details">
                    <summary>Läs hela {isComment ? "VD-kommentaren" : "VD-ordet"}</summary>
                    <div>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                </details>
            )}
            {sourceUrl && <a className="company-text-link company-ceo-source" href={sourceUrl} target="_blank" rel="noreferrer">Öppna originalkällan <FiExternalLink /></a>}
        </section>
    );
}

function FinancialsTab({ financials, estimates }) {
    const estimatePeriod = estimatePeriodFromSnapshot(estimates?.latest);
    const [frequency, setFrequency] = useState(estimatePeriod ? "quarterly" : financials?.ttm?.length ? "ttm" : "annual");
    const options = [
        ["annual", "År", financials?.annual],
        ["quarterly", "Kvartal", financials?.quarterly],
        ["ttm", "R12", financials?.ttm],
    ];
    const basePeriods = options.find(([id]) => id === frequency)?.[2] ?? [];
    const periods = [
        ...basePeriods.slice(frequency === "quarterly" && estimatePeriod ? -5 : -6),
        ...(frequency === "quarterly" && estimatePeriod ? [estimatePeriod] : []),
    ];
    const currency = financials?.currency ?? estimates?.latest?.metrics?.find((metric) => metric.currency)?.currency ?? "SEK";
    const financialRows = [
        ["Omsättning", "revenue", "money"],
        ["EBIT", "ebit", "money"],
        ...(periods.some((period) => period.ebita != null) ? [["EBITA", "ebita", "money"]] : []),
        ["EBITDA", "ebitda", "money"],
        ["Nettoresultat", "netIncome", "money"],
        ["Fritt kassaflöde", "freeCashFlow", "money"],
        ["EBIT-marginal", "ebitMarginPct", "pct"],
    ];
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Rapporterat, härlett och estimerat</p>
            <h2>Finansiell utveckling</h2>
            {/* <p className="company-intro">Jämför bolagets senaste perioder. R12 beräknas bara när fyra sammanhängande kvartal finns och estimat markeras med randiga staplar.</p> */}
            <div className="company-period-tabs">
                {options.map(([id, label, values]) => (
                    <button key={id} disabled={!values?.length} className={frequency === id ? "active" : ""} onClick={() => setFrequency(id)}>{label}</button>
                ))}
            </div>
            {!periods.length ? <p className="company-empty">Data saknas för vald period.</p> : (
                <>
                    <FinancialDevelopmentChart periods={periods} currency={currency} />
                    <div className="company-table-wrap">
                        <table className="company-financial-table">
                            <thead><tr><th>Nyckeltal</th>{periods.map((period) => <th className={period.estimate ? "company-estimate-cell" : ""} key={period.periodKey ?? period.periodEnd}>{periodLabel(period)}</th>)}</tr></thead>
                            <tbody>
                                {financialRows.map(([label, key, type]) => (
                                    <tr key={key}><th>{label}</th>{periods.map((period) => (
                                        <td className={period.estimate ? "company-estimate-cell" : ""} key={period.periodKey ?? period.periodEnd}>
                                            {type === "money" ? money(period[key], currency) : period[key] == null ? "–" : `${number(period[key])}%`}
                                            {period.estimateAdjusted?.[key] && <small className="company-adjusted-mark"> just.</small>}
                                        </td>
                                    ))}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            <p className="company-source">
                {frequency === "quarterly" && estimatePeriod ? ` Estimat: ${estimatePeriod.estimateSource.publisher ?? estimatePeriod.estimateSource.name}${estimatePeriod.estimateSource.contributors ? `, ${estimatePeriod.estimateSource.contributors} bidragsgivare` : ""}.` : ""}
                {frequency === "quarterly" && estimatePeriod?.estimateSource.url && <> <a href={estimatePeriod.estimateSource.url} target="_blank" rel="noreferrer">Visa estimatkällan <FiExternalLink /></a></>}
            </p>
            <ManagementComment comment={financials?.managementComment} latestReport={financials?.latestReport} />
        </section>
    );
}

function EstimatesTab({ summary, estimates }) {
    const calendar = summary.calendar;
    const latest = estimates?.latest;
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Offentligt konsensus</p>
            <h2>Vad väntar marknaden sig?</h2>
            <p className="company-intro">Estimat visas bara med källa och period. Täckningen är fortfarande begränsad för mindre svenska bolag.</p>
            <div className="company-metric-grid company-metric-grid-small">
                <Metric label="EPS-estimat" value={calendar?.epsEstimate?.average == null ? "Saknas" : `${number(calendar.epsEstimate.average, 2)} ${calendar.currency ?? "SEK"}`} />
                <Metric label="Omsättningsestimat" value={money(calendar?.revenueEstimate?.average, calendar?.currency ?? "SEK")} />
                <Metric label="Nästa estimatperiod" value={latest?.fiscalPeriod ?? summary.upcomingEstimate?.fiscalPeriod ?? "Saknas"} />
            </div>
            {!latest && <p className="company-empty">Inget öppet konsensusestimat har samlats in för bolaget ännu.</p>}
        </section>
    );
}

function ValuationTab() {
    return (
        <section className="company-tab-section company-narrow-copy">
            <p className="company-eyebrow">Under utveckling</p>
            <h2>Värdering utan svart låda</h2>
            <p className="company-intro">OMXsum publicerar inte ett förenklat totalbetyg eller ett påhittat riktvärde. Den här sidan öppnas när jämförelsegrupper, aktieantal och värderingsdefinitioner kan visas tillsammans med varje beräkning.</p>
        </section>
    );
}

function NewsTab({ data }) {
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Primärkällor först</p>
            <h2>Nyheter och rapporter</h2>
            <div className="company-news-report-layout">
                <NewsList news={data.news} />
                <div className="company-report-list">
                    <h3>Rapporter</h3>
                    {(data.reports ?? []).length ? data.reports.map((report) => (
                        <a key={report.reportDocumentId} href={report.attachment?.url ?? report.releaseUrl} target="_blank" rel="noreferrer">
                            <span>{report.title ?? report.periodLabel ?? report.fiscalPeriod}</span>
                            <small>{svDate(report.publishedAt)}</small>
                        </a>
                    )) : <p className="company-empty">Inga rapportdokument hittades.</p>}
                </div>
            </div>
        </section>
    );
}

const CALENDAR_EVENT_LABELS = {
    earnings: "Rapport",
    agm: "Årsstämma",
    ex_dividend: "X-dag",
    dividend: "Utdelning",
    capital_market_day: "Kapitalmarknadsdag",
};

const parseCalendarDate = (value) => {
    const [year, month, day] = String(value ?? "").slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day, 12);
    return Number.isNaN(date.getTime()) ? null : date;
};

const calendarDateKey = (value) => {
    const date = value instanceof Date ? value : parseCalendarDate(value);
    if (!date) return "";
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};

const calendarEventLabel = (type) => CALENDAR_EVENT_LABELS[type]
    ?? String(type ?? "Händelse").replaceAll("_", " ");

function CalendarTab({ calendar }) {
    const todayKey = stockholmDay(Date.now());
    const today = parseCalendarDate(todayKey);
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    const [visibleMonth, setVisibleMonth] = useState(currentMonth);

    const events = useMemo(() => {
        const candidates = [
            ...(calendar?.events ?? []),
            ...(calendar?.earningsDates ?? []).map((date) => ({ type: "earnings", date })),
            ...(calendar?.exDividendDate ? [{ type: "ex_dividend", date: calendar.exDividendDate }] : []),
            ...(calendar?.dividendDate ? [{ type: "dividend", date: calendar.dividendDate }] : []),
        ];
        const seen = new Set();
        return candidates
            .filter((event) => calendarDateKey(event.date) >= todayKey)
            .filter((event) => {
                const key = `${calendarDateKey(event.date)}-${event.type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((left, right) => calendarDateKey(left.date).localeCompare(calendarDateKey(right.date)));
    }, [calendar, todayKey]);

    const eventsByDate = useMemo(() => events.reduce((result, event) => {
        const key = calendarDateKey(event.date);
        result.set(key, [...(result.get(key) ?? []), event]);
        return result;
    }, new Map()), [events]);

    const days = useMemo(() => {
        const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
        const mondayOffset = (first.getDay() + 6) % 7;
        const start = new Date(first);
        start.setDate(first.getDate() - mondayOffset);
        const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
        const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
        return Array.from({ length: cellCount }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [visibleMonth]);

    const showingCurrentMonth = visibleMonth.getFullYear() === currentMonth.getFullYear()
        && visibleMonth.getMonth() === currentMonth.getMonth();
    const moveMonth = (offset) => setVisibleMonth((month) =>
        new Date(month.getFullYear(), month.getMonth() + offset, 1, 12));
    const showEventMonth = (event) => {
        const date = parseCalendarDate(event.date);
        if (date) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    };

    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Bolagets datum</p>
            <h2>Rapporter och kapitalhändelser</h2>
            <div className="company-calendar-layout">
                <div className="company-calendar">
                    <header className="company-calendar-toolbar">
                        <button type="button" disabled={showingCurrentMonth} aria-label="Föregående månad" onClick={() => moveMonth(-1)}><FiChevronLeft /></button>
                        <h3>{visibleMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}</h3>
                        <button type="button" aria-label="Nästa månad" onClick={() => moveMonth(1)}><FiChevronRight /></button>
                    </header>
                    <div className="company-calendar-weekdays" aria-hidden="true">
                        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="company-calendar-grid" role="grid" aria-label={visibleMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}>
                        {days.map((date) => {
                            const key = calendarDateKey(date);
                            const dayEvents = eventsByDate.get(key) ?? [];
                            const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
                            const hasPassed = key < todayKey;
                            return (
                                <div
                                    key={key}
                                    role="gridcell"
                                    className={`company-calendar-day ${outsideMonth ? "outside" : ""} ${hasPassed ? "past" : ""} ${key === todayKey ? "today" : ""}`}
                                >
                                    <time dateTime={key}>{date.getDate()}</time>
                                    <div className="company-calendar-day-events">
                                        {dayEvents.slice(0, 2).map((event) => (
                                            <span key={event.id ?? event.eventId ?? `${event.type}-${event.date}`} title={`${calendarEventLabel(event.type)}${event.fiscalPeriod ? ` · ${event.fiscalPeriod}` : ""}`}>
                                                {event.fiscalPeriod ?? calendarEventLabel(event.type)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <aside className="company-calendar-upcoming" aria-label="Kommande händelser">
                    <div className="company-calendar-upcoming-heading">
                        <h3>Kommande</h3>
                        <span>{events.length}</span>
                    </div>
                    {events.length ? events.slice(0, 6).map((event) => {
                        const date = parseCalendarDate(event.date);
                        return (
                            <button type="button" key={event.id ?? event.eventId ?? `${event.type}-${event.date}`} onClick={() => showEventMonth(event)}>
                                <time dateTime={calendarDateKey(event.date)}>
                                    <strong>{date?.getDate()}</strong>
                                    <span>{date?.toLocaleDateString("sv-SE", { month: "short", year: "numeric" })}</span>
                                </time>
                                <span>
                                    <strong>{event.fiscalPeriod ?? calendarEventLabel(event.type)}</strong>
                                    <small>{calendarEventLabel(event.type)}</small>
                                </span>
                                <FiChevronRight />
                            </button>
                        );
                    }) : <p className="company-empty">Inga kommande bolagshändelser är bekräftade.</p>}
                </aside>
            </div>
        </section>
    );
}

function Performance({ returns }) {
    const periods = [["1 mån", "1m"], ["3 mån", "3m"], ["6 mån", "6m"], ["I år", "ytd"], ["1 år", "1y"]];
    return (
        <div className="company-performance" aria-label="Kursutveckling per period">
            {periods.map(([label, key]) => {
                const value = returns?.[key];
                const tone = value == null ? "neutral" : value >= 0 ? "positive" : "negative";
                return <div key={key}><span>{label}</span><strong className={tone}>{pct(value)}</strong></div>;
            })}
        </div>
    );
}

// Tabs that live behind Plus. Everything else — identity, chart, description,
// news and calendar — stays open so the page works as a public landing page.
const PLUS_TABS = new Set(["financials", "estimates", "valuation"]);

function PlusTabGate({ companyName }) {
    const { isGuestUser } = useAuthContext();
    const { openModal } = useModal();
    return (
        <section className="company-tab-section company-plus-gate">
            <FaLock />
            <h2>Finansiell data ingår i Plus</h2>
            <p>
                Omsättning, resultat, marginaler och estimat för {companyName} – tillsammans med
                live-nyhetsflödet och klickbara tickers i breven.
            </p>
            <div className="company-plus-gate-actions">
                <Link href="/pro" className="primary-btn extra-padding">Se planer – från 49 kr/mån</Link>
                {isGuestUser !== false && (
                    <button onClick={() => openModal(<LogInModal />)}>Har du redan Plus? Logga in</button>
                )}
            </div>
        </section>
    );
}

export default function CompanyPage({ symbol, initialData, initialTab, initialRange, initialMovingAverages, mentions = [] }) {
    const { isPlusUser } = useAuthContext();
    const allowedTab = TABS.some((tab) => tab.id === initialTab) ? initialTab : "overview";
    const [tab, setTab] = useState(allowedTab);

    useEffect(() => {
        setTab(allowedTab);
    }, [allowedTab]);

    if (!initialData?.summary) {
        return (
            <main className="company-page company-not-found">
                <h1>Aktien kunde inte hittas</h1>
                <p>Kontrollera symbolen eller använd aktiesökningen i sidhuvudet.</p>
                <Link className="company-text-link" href="/">Till startsidan <FiChevronRight /></Link>
            </main>
        );
    }

    const { summary } = initialData;
    const profile = summary.profile;
    // The server already resolved the plan while fetching, so the correct view
    // renders on the first paint; the context is only a fallback for payloads
    // from a backend that predates the access flag.
    const hasPlus = initialData.access?.plus ?? isPlusUser;

    const selectTab = (nextTab) => {
        setTab(nextTab);
        const params = new URLSearchParams(window.location.search);
        if (nextTab === "overview") params.delete("tab");
        else params.set("tab", nextTab);
        const query = params.toString();
        const path = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history.replaceState(window.history.state, "", path);
    };

    return (
        <main className="company-page">
            

            {/* <Performance returns={summary.performance?.returns} /> */}
            <CompanyChart
                summary={summary}
                symbol={symbol}
                chart={initialData.chart}
                initialRange={initialRange}
                initialMovingAverages={initialMovingAverages}
                companyName={initialData.summary.profile.name ?? initialData.summary.symbol}
            />

            <nav className="company-tabs" aria-label="Bolagsnavigation">
                {TABS.map((item) => (
                    <button type="button" key={item.id} className={"flex flex-row items-center " + (tab === item.id ? "active" : "")} onClick={() => selectTab(item.id)}>
                        {item.label}
                        {!hasPlus && PLUS_TABS.has(item.id) && <FaLock className="company-tab-lock" />}
                    </button>
                ))}
            </nav>

            {tab === "overview" && <OverviewTab data={initialData} mentions={mentions} onSelectTab={selectTab} />}
            {!hasPlus && PLUS_TABS.has(tab) && <PlusTabGate companyName={profile.name ?? symbol} />}
            {hasPlus && tab === "financials" && <FinancialsTab financials={initialData.financials} estimates={initialData.estimates} />}
            {hasPlus && tab === "estimates" && <EstimatesTab summary={summary} estimates={initialData.estimates} />}
            {hasPlus && tab === "valuation" && <ValuationTab />}
            {tab === "news" && <NewsTab data={initialData} />}
            {tab === "calendar" && <CalendarTab calendar={summary.calendar} />}
        </main>
    );
}
