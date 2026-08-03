"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { FaArrowLeft } from "react-icons/fa";
import {
    ResponsiveContainer, AreaChart, Area, ComposedChart, Bar, Line, Legend,
    XAxis, YAxis, ReferenceLine, Tooltip,
} from "recharts";
import { fetchStock, fetchFinancials } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import PlusPaywall from "./PlusPaywall";
import NewsFeedItem from "./NewsFeedItem";

const POLL_MS = 30_000;

const VIEW_OPTIONS = [
    { id: "intraday", label: "Idag" },
    { id: "6m", label: "6 mån" },
    { id: "1y", label: "1 år" },
    { id: "financials", label: "Finanser" },
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

function StockGraph({ stock }) {
    const data = (stock.ticks ?? []).map(([ts, price]) => ({ ts, price }));
    const isDaily = stock.interval === "1d";

    if (data.length === 0) {
        return <p className="text-text-muted font-sans text-sm py-8">Ingen kursdata tillgänglig.</p>;
    }

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices, isDaily ? Infinity : stock.prevClose ?? Infinity);
    const max = Math.max(...prices, isDaily ? -Infinity : stock.prevClose ?? -Infinity);
    const pad = (max - min) * 0.08 || 1;
    const lastPrice = prices[prices.length - 1];
    // Intraday colors by today's move, daily by the shown period
    const up = isDaily ? lastPrice >= prices[0] : stock.prevClose ? lastPrice >= stock.prevClose : true;
    const color = up ? "#668CF4" : "#fbbf24";
    const timeFormat = isDaily ? "D MMM" : "HH:mm";

    return (
        <div className="w-full h-72 font-sans">
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
                </AreaChart>
            </ResponsiveContainer>
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
                    <XAxis
                        dataKey="year"
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                    />
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
                    <Legend
                        formatter={(key) => <span style={{ fontSize: 12 }}>{labels[key] ?? key}</span>}
                    />
                    <Bar yAxisId="money" dataKey="revenue" fill="#668CF4" isAnimationActive={false} />
                    <Bar yAxisId="money" dataKey="ebit" fill="#fbbf24" isAnimationActive={false} />
                    <Bar yAxisId="money" dataKey="third" fill="#34d399" isAnimationActive={false} />
                    <Line
                        yAxisId="pct"
                        dataKey="margin"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

function StockContent({ symbol }) {
    const [data, setData] = useState(null);
    const [financials, setFinancials] = useState(null);
    const [view, setView] = useState("intraday");
    const [error, setError] = useState("");

    // Reset everything when navigating between stocks
    useEffect(() => {
        setData(null);
        setFinancials(null);
        setView("intraday");
        setError("");
    }, [symbol]);

    useEffect(() => {
        if (view === "financials") {
            if (financials) return;
            fetchFinancials(symbol)
                .then((res) => setFinancials(res.error ? { annual: [] } : res))
                .catch(() => setFinancials({ annual: [] }));
            return;
        }

        let active = true;
        const load = async () => {
            try {
                const res = await fetchStock(symbol, view);
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
        if (view !== "intraday") return () => { active = false; };
        const timer = setInterval(load, POLL_MS);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [symbol, view, financials]);

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
                <div className="flex flex-row justify-end gap-1 mb-2 font-sans text-xs">
                    {VIEW_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setView(option.id)}
                            className={`px-2 py-1 cursor-pointer transition-colors ${view === option.id
                                ? "text-text border-b-2 border-secondary"
                                : "text-text-muted hover:text-text"}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                {view === "financials" ? (
                    financials ? <FinancialsChart financials={financials} /> : <div className="h-72"></div>
                ) : (
                    <StockGraph stock={stock} />
                )}
            </div>

            <h2 className="text-lg font-serif font-black italic text-text-muted mb-2 border-b border-border pb-2">
                Nyheter om {stock.name ?? stock.label}
            </h2>
            {news.length === 0 ? (
                <p className="text-text-muted font-sans py-8">Inga nyheter för det här bolaget ännu.</p>
            ) : (
                <div className="flex flex-col">
                    {news.map((item) => (
                        <NewsFeedItem key={item.id} item={item} showSymbol={false} />
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
