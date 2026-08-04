"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { FaArrowLeft } from "react-icons/fa";
import {
    ResponsiveContainer, AreaChart, Area, ComposedChart, Bar, Line, Legend,
    XAxis, YAxis, ReferenceLine, ReferenceDot, Tooltip,
} from "recharts";
import { fetchStock, fetchFinancials, fetchCalendar, fetchHistory } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import { tagHex } from "../utils/newsTags";
import PlusPaywall from "./PlusPaywall";
import NewsFeedItem from "./NewsFeedItem";

const POLL_MS = 30_000;

const VIEWS = [
    { id: "chart", label: "Kurs" },
    { id: "financials", label: "Finanser" },
    { id: "calendar", label: "Kalender" },
    { id: "history", label: "Historik" },
];

const RANGES = [
    { id: "intraday", label: "Idag" },
    { id: "6m", label: "6 mån" },
    { id: "1y", label: "1 år" },
];

const tooltipStyle = {
    background: "var(--color-foreground)",
    border: "1px solid var(--color-border)",
    fontSize: 12,
    color: "var(--color-text)",
};

// 473479000000, "SEK" -> "473,5 mdSEK"
const formatMoney = (value, currency = "SEK") => {
    if (value == null) return "–";
    const abs = Math.abs(value);
    if (abs >= 1e9) return (value / 1e9).toLocaleString("sv-SE", { maximumFractionDigits: 1 }) + " md" + currency;
    return (value / 1e6).toLocaleString("sv-SE", { maximumFractionDigits: 1 }) + " M" + currency;
};

const formatVolume = (value) => {
    if (value == null) return "–";
    if (value >= 1e6) return (value / 1e6).toLocaleString("sv-SE", { maximumFractionDigits: 1 }) + " M";
    if (value >= 1e3) return (value / 1e3).toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " k";
    return String(value);
};

function StockGraph({ stock, news, onSelectNews }) {
    const data = (stock.ticks ?? []).map(([ts, price]) => ({ ts, price }));
    const isDaily = stock.interval === "1d";
    const [hovered, setHovered] = useState(null);

    // Place each news story on the nearest bar so markers sit on the line.
    // Stories on the same bar share one marker.
    const markers = useMemo(() => {
        if (data.length === 0) return [];
        const seen = new Map();
        for (const item of news) {
            if (item.ts < data[0].ts - 36e5 || item.ts > data[data.length - 1].ts + 864e5) continue;
            let nearest = data[0];
            for (const point of data) {
                if (Math.abs(point.ts - item.ts) < Math.abs(nearest.ts - item.ts)) nearest = point;
            }
            const existing = seen.get(nearest.ts);
            if (existing) {
                existing.items.push(item);
            } else {
                seen.set(nearest.ts, {
                    ts: nearest.ts,
                    price: nearest.price,
                    color: tagHex(item.labels),
                    items: [item],
                });
            }
        }
        return [...seen.values()];
    }, [stock, news]);

    if (data.length === 0) {
        return <p className="text-text-muted font-sans text-sm py-8">Ingen kursdata tillgänglig.</p>;
    }

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices, isDaily ? Infinity : stock.prevClose ?? Infinity);
    const max = Math.max(...prices, isDaily ? -Infinity : stock.prevClose ?? -Infinity);
    const pad = (max - min) * 0.08 || 1;
    const lastPrice = prices[prices.length - 1];
    const up = isDaily ? lastPrice >= prices[0] : stock.prevClose ? lastPrice >= stock.prevClose : true;
    const color = up ? "#668CF4" : "#fbbf24";
    const timeFormat = isDaily ? "D MMM" : "HH:mm";

    return (
        <div className="w-full h-72 font-sans relative">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="ts"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(ts) => dayjs(ts).format(timeFormat)}
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                        minTickGap={60}
                        fontSize={11}
                    />
                    <YAxis
                        domain={[min - pad, max + pad]}
                        orientation="right"
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        width={55}
                        tickFormatter={(v) => v.toFixed(1)}
                    />
                    <Tooltip
                        labelFormatter={(ts) => dayjs(ts).format(isDaily ? "D MMM YYYY" : "HH:mm:ss")}
                        formatter={(value) => [value.toFixed(2) + " kr", "Kurs"]}
                        contentStyle={tooltipStyle}
                    />
                    {!isDaily && stock.prevClose && (
                        <ReferenceLine y={stock.prevClose} stroke="#6b7280" strokeDasharray="4 4" />
                    )}
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={1.5}
                        fill="url(#stockFill)"
                        dot={false}
                        isAnimationActive={false}
                    />
                    {markers.map((marker) => (
                        <ReferenceDot
                            key={marker.ts}
                            x={marker.ts}
                            y={marker.price}
                            shape={({ cx, cy }) => (
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={hovered?.ts === marker.ts ? 5.5 : 4}
                                    fill={marker.color}
                                    stroke="var(--color-background)"
                                    strokeWidth={1.5}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => onSelectNews?.(marker.items[0].id)}
                                    onMouseEnter={() => setHovered({ ts: marker.ts, x: cx, y: cy, items: marker.items })}
                                    onMouseLeave={() => setHovered(null)}
                                />
                            )}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
            {hovered && (
                <div
                    className="absolute z-10 pointer-events-none px-3 py-2 bg-foreground border border-border max-w-[18rem]"
                    style={{ left: hovered.x, top: hovered.y - 12, transform: "translate(-50%, -100%)" }}
                >
                    {hovered.items.slice(0, 2).map((item) => (
                        <p key={item.id} className="text-xs text-text leading-snug mb-1 last:mb-0">{item.title}</p>
                    ))}
                    {hovered.items.length > 2 && (
                        <p className="text-[11px] text-text-muted">+{hovered.items.length - 2} till</p>
                    )}
                </div>
            )}
            {markers.length > 0 && (
                <p className="text-[11px] font-sans text-text-muted mt-1 text-right">
                    <span>●</span> nyhet – klicka för att läsa
                </p>
            )}
        </div>
    );
}

function FinancialsChart({ financials }) {
    const annual = financials?.annual ?? [];

    if (annual.length === 0) {
        return <p className="text-text-muted font-sans text-sm py-8">Ingen finansiell data tillgänglig.</p>;
    }

    // Yahoo rarely provides EBITA separately — show EBITDA instead when missing
    const hasEbita = annual.some((row) => row.ebita != null);
    const thirdKey = hasEbita ? "ebita" : "ebitda";
    const thirdLabel = hasEbita ? "EBITA" : "EBITDA";

    const rows = annual.map((row) => ({
        year: row.fiscalYear,
        revenue: row.revenue,
        ebit: row.ebit,
        third: row[thirdKey],
        margin: row.ebitMarginPct,
    }));

    const labels = { revenue: "Omsättning", ebit: "EBIT", third: thirdLabel, margin: "EBIT-marginal" };

    return (
        <div className="w-full h-72 font-sans">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="year" stroke="#6b7280" axisLine={false} tickLine={false} fontSize={11} />
                    <YAxis
                        yAxisId="money"
                        orientation="left"
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        width={60}
                        tickFormatter={(v) => (Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(0) + " md" : (v / 1e6).toFixed(0) + " M")}
                    />
                    <YAxis
                        yAxisId="pct"
                        orientation="right"
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        width={40}
                        tickFormatter={(v) => v.toFixed(0) + "%"}
                    />
                    <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, key) =>
                            key === "margin"
                                ? [value != null ? value.toFixed(1) + "%" : "–", labels.margin]
                                : [formatMoney(value, financials.currency), labels[key] ?? key]
                        }
                    />
                    <Legend formatter={(key) => <span style={{ fontSize: 12 }}>{labels[key] ?? key}</span>} />
                    <Bar yAxisId="money" dataKey="revenue" fill="#668CF4" isAnimationActive={false} />
                    <Bar yAxisId="money" dataKey="ebit" fill="#fbbf24" isAnimationActive={false} />
                    <Bar yAxisId="money" dataKey="third" fill="#34d399" isAnimationActive={false} />
                    <Line yAxisId="pct" dataKey="margin" stroke="#9ca3af" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

const svDate = (d, opts = { day: "numeric", month: "long", year: "numeric" }) =>
    d ? new Date(d).toLocaleDateString("sv-SE", opts) : "–";

const daysUntil = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
    return diff >= 0 ? diff : null;
};

function DaysPill({ date, accent = false }) {
    const days = daysUntil(date);
    if (days == null) return null;
    const text = days === 0 ? "Idag" : `Om ${days} dagar`;
    return (
        <span className={`w-fit text-[11px] uppercase tracking-wider border px-2 py-0.5 ${accent ? "text-primary border-primary/40" : "text-text-muted border-border"}`}>
            {text}
        </span>
    );
}

function CalendarView({ calendar }) {
    const nextEarnings = (calendar?.earningsDates ?? [])[0] ?? null;

    if (!calendar || (calendar.hasData === false) || (!nextEarnings && !calendar.exDividendDate && !calendar.dividendDate)) {
        return <p className="text-text-muted font-sans text-sm py-8">Ingen kalenderdata tillgänglig.</p>;
    }

    const currency = calendar.estimates?.currency ?? "SEK";
    const eps = calendar.estimates?.eps ?? {};
    const revenue = calendar.estimates?.revenue ?? {};
    const fmtEps = (v) => (v != null ? v.toLocaleString("sv-SE", { maximumFractionDigits: 2 }) : null);

    return (
        <div className="font-sans py-2">
            <div className="text-[11px] uppercase tracking-wider text-text-muted mb-8">
                Bolagskalender
            </div>

            {nextEarnings && (
                <div className="flex flex-row items-center gap-6 mb-10">
                    <div className="flex flex-col items-center border border-border w-20 shrink-0">
                        <span className="w-full text-center text-[10px] uppercase tracking-widest bg-foreground text-text-muted py-1">
                            {svDate(nextEarnings, { month: "short" }).replace(".", "")}
                        </span>
                        <span className="text-3xl font-bold text-text py-1">
                            {new Date(nextEarnings).getDate()}
                        </span>
                        <span className="text-[10px] text-text-muted pb-1.5">
                            {new Date(nextEarnings).getFullYear()}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase tracking-wider text-text-muted">Nästa rapport</span>
                        <span className="text-2xl md:text-3xl font-serif font-bold text-text">{svDate(nextEarnings)}</span>
                        <DaysPill date={nextEarnings} accent />
                    </div>
                </div>
            )}

            {(eps.average != null || revenue.average != null) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    {eps.average != null && (
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted">EPS-estimat</span>
                            <span className="text-2xl font-bold text-primary">{fmtEps(eps.average)} {currency}</span>
                            {eps.low != null && eps.high != null && (
                                <span className="text-sm text-text-muted">{fmtEps(eps.low)}–{fmtEps(eps.high)} {currency}</span>
                            )}
                        </div>
                    )}
                    {revenue.average != null && (
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted">Omsättningsestimat</span>
                            <span className="text-2xl font-bold text-primary">{formatMoney(revenue.average, currency)}</span>
                            {revenue.low != null && revenue.high != null && (
                                <span className="text-sm text-text-muted">{formatMoney(revenue.low, currency)}–{formatMoney(revenue.high, currency)}</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {calendar.exDividendDate && (
                <div className="flex flex-row justify-between items-center py-2">
                    <span className="text-[11px] uppercase tracking-wider text-text-muted">X-datum utdelning</span>
                    <div className="flex flex-row items-center gap-3">
                        <span className="text-lg font-serif font-bold text-text">{svDate(calendar.exDividendDate)}</span>
                        <DaysPill date={calendar.exDividendDate} />
                    </div>
                </div>
            )}

            {calendar.dividendDate && (
                <div className="flex flex-row justify-between items-center py-2">
                    <span className="text-[11px] uppercase tracking-wider text-text-muted">Utdelningsdag</span>
                    <div className="flex flex-row items-center gap-3">
                        <span className="text-lg font-serif font-bold text-text">{svDate(calendar.dividendDate)}</span>
                        <DaysPill date={calendar.dividendDate} />
                    </div>
                </div>
            )}

            <p className="text-xs text-text-muted mt-8">
                Kalenderdatum och analytikerestimat kan ändras. Bekräfta viktiga händelser med bolaget.
            </p>
        </div>
    );
}

function HistoryTable({ history }) {
    const bars = [...(history?.bars ?? [])].reverse();

    if (bars.length === 0) {
        return <p className="text-text-muted font-sans text-sm py-8">Ingen kurshistorik tillgänglig.</p>;
    }

    return (
        <div className="font-sans text-sm max-h-96 overflow-y-auto border-b border-border">
            <table className="w-full">
                <thead className="sticky top-0 bg-background">
                    <tr className="text-xs uppercase tracking-wide text-text-muted border-b border-border">
                        <th className="text-left py-2 font-medium">Datum</th>
                        <th className="text-right py-2 font-medium">Stängning</th>
                        <th className="text-right py-2 font-medium">+/−</th>
                        <th className="text-right py-2 font-medium hidden md:table-cell">Högst</th>
                        <th className="text-right py-2 font-medium hidden md:table-cell">Lägst</th>
                        <th className="text-right py-2 font-medium">Volym</th>
                    </tr>
                </thead>
                <tbody>
                    {bars.map((bar, idx) => {
                        const prev = bars[idx + 1];
                        const pct = prev?.close ? ((bar.close - prev.close) / prev.close) * 100 : null;
                        const up = (pct ?? 0) >= 0;
                        return (
                            <tr key={bar.date} className="border-b border-border/50 text-text-article">
                                <td className="py-2">{dayjs(bar.time).format("D MMM YYYY")}</td>
                                <td className="py-2 text-right font-semibold text-text">{bar.close?.toFixed(2)}</td>
                                <td className={`py-2 text-right ${pct == null ? "text-text-muted" : up ? "text-primary" : "text-secondary"}`}>
                                    {pct == null ? "–" : `${up ? "+" : ""}${pct.toFixed(2)}%`}
                                </td>
                                <td className="py-2 text-right hidden md:table-cell">{bar.high?.toFixed(2)}</td>
                                <td className="py-2 text-right hidden md:table-cell">{bar.low?.toFixed(2)}</td>
                                <td className="py-2 text-right text-text-muted">{formatVolume(bar.volume)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function StockContent({ symbol }) {
    const [data, setData] = useState(null);
    const [financials, setFinancials] = useState(null);
    const [calendar, setCalendar] = useState(null);
    const [history, setHistory] = useState(null);
    const [view, setView] = useState("chart");
    const [range, setRange] = useState("intraday");
    const [highlightId, setHighlightId] = useState(null);
    const [error, setError] = useState("");
    const highlightTimer = useRef(null);

    // Reset everything when navigating between stocks
    useEffect(() => {
        setData(null);
        setFinancials(null);
        setCalendar(null);
        setHistory(null);
        setView("chart");
        setRange("intraday");
        setError("");
    }, [symbol]);

    // Price data + news (always loaded — header and news list need it)
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await fetchStock(symbol, range);
                if (!active) return;
                if (res.stock) {
                    setData(res);
                    setError("");
                } else {
                    setError(res.error || "Kunde inte hämta aktien");
                }
            } catch {
                if (active) setError("Kunde inte hämta aktien");
            }
        };

        load();
        if (range !== "intraday") return () => { active = false; };
        const timer = setInterval(load, POLL_MS);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [symbol, range]);

    // Lazy-load per view, cached per stock
    useEffect(() => {
        if (view === "financials" && !financials) {
            fetchFinancials(symbol)
                .then((res) => setFinancials(res.error ? { annual: [] } : res))
                .catch(() => setFinancials({ annual: [] }));
        } else if (view === "calendar" && !calendar) {
            fetchCalendar(symbol)
                .then((res) => setCalendar(res.error ? { hasData: false } : res))
                .catch(() => setCalendar({ hasData: false }));
        } else if (view === "history" && !history) {
            fetchHistory(symbol)
                .then((res) => setHistory(res.error ? { bars: [] } : res))
                .catch(() => setHistory({ bars: [] }));
        }
    }, [view, symbol, financials, calendar, history]);

    const handleSelectNews = (id) => {
        document.getElementById(`news-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(id);
        clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setHighlightId(null), 2000);
    };

    if (error && !data) {
        return (
            <div className="py-16 text-center font-sans">
                <p className="text-text-muted mb-4">{error}</p>
                <Link href="/marknadsnyheter" className="text-primary underline">Till marknadsnyheterna</Link>
            </div>
        );
    }

    if (!data) {
        return <div className="min-h-[24rem]"></div>;
    }

    const { stock } = data;
    const news = (data.news ?? []).map(storyToItem);
    const lastPrice = stock.price ?? (stock.ticks?.length ? stock.ticks[stock.ticks.length - 1][1] : null);
    const change = stock.change ?? (lastPrice && stock.prevClose ? lastPrice - stock.prevClose : null);
    const changePct = stock.changePct ?? (change !== null && stock.prevClose ? (change / stock.prevClose) * 100 : null);
    const up = (change ?? 0) >= 0;

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold italic text-text mb-1">{stock.name ?? stock.label}</h1>
                    <span className="font-sans text-sm text-text-muted">{stock.label} • {stock.symbol}</span>
                </div>
                {lastPrice && (
                    <div className="flex flex-col md:items-end font-sans">
                        <span className="text-3xl font-bold text-text">{lastPrice.toFixed(2)} kr</span>
                        {change !== null && (
                            <span className={`text-sm font-semibold ${up ? "text-primary" : "text-secondary"}`}>
                                {up ? "+" : ""}{change.toFixed(2)} ({up ? "+" : ""}{changePct.toFixed(2)}%)
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="mb-10">
                <div className="flex flex-row items-center justify-between border-b border-border mb-4 font-sans text-sm">
                    <div className="flex flex-row">
                        {VIEWS.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setView(option.id)}
                                className={`px-3 py-2 cursor-pointer transition-colors -mb-px ${view === option.id
                                    ? "text-text border-b-2 border-secondary font-semibold"
                                    : "text-text-muted hover:text-text"}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {view === "chart" && (
                        <div className="flex flex-row gap-1 text-xs">
                            {RANGES.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setRange(option.id)}
                                    className={`px-2 py-1 cursor-pointer transition-colors ${range === option.id
                                        ? "text-text border-b-2 border-secondary"
                                        : "text-text-muted hover:text-text"}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {view === "chart" && <StockGraph stock={stock} news={news} onSelectNews={handleSelectNews} />}
                {view === "financials" && (financials ? <FinancialsChart financials={financials} /> : <div className="h-72"></div>)}
                {view === "calendar" && (calendar ? <CalendarView calendar={calendar} /> : <div className="h-40"></div>)}
                {view === "history" && (history ? <HistoryTable history={history} /> : <div className="h-72"></div>)}
            </div>

            <h2 className="text-lg font-serif font-black italic text-text-muted mb-2 border-b border-border pb-2">
                Nyheter om {stock.name ?? stock.label}
            </h2>
            {news.length === 0 ? (
                <p className="text-text-muted font-sans py-8">Inga nyheter för det här bolaget ännu.</p>
            ) : (
                <div className="flex flex-col">
                    {news.map((item) => (
                        <NewsFeedItem key={item.id} item={item} showSymbol={false} highlighted={item.id === highlightId} />
                    ))}
                </div>
            )}
        </>
    );
}

export default function StockPage({ symbol }) {
    return (
        <main className="min-h-[80vh] mx-auto max-w-3xl px-4 py-8">
            <Link href="/marknadsnyheter" className="flex flex-row items-center gap-2 text-text-muted hover:text-secondary transition-colors mb-8 font-sans text-sm">
                <FaArrowLeft /> Marknadsnyheter
            </Link>
            <PlusPaywall redirectTo={`/aktie/${encodeURIComponent(symbol)}`}>
                <StockContent symbol={symbol} />
            </PlusPaywall>
        </main>
    );
}
