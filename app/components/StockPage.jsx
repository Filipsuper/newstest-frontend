"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { FaArrowLeft } from "react-icons/fa";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip } from "recharts";
import { fetchStock } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import PlusPaywall from "./PlusPaywall";
import NewsFeedItem from "./NewsFeedItem";

const POLL_MS = 30_000;

function StockGraph({ stock }) {
    const data = (stock.ticks ?? []).map(([ts, price]) => ({ ts, price }));

    if (data.length === 0) {
        return <p className="text-text-muted font-sans text-sm py-8">Ingen kursdata för senaste sessionen.</p>;
    }

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices, stock.prevClose ?? Infinity);
    const max = Math.max(...prices, stock.prevClose ?? -Infinity);
    const pad = (max - min) * 0.08 || 1;
    const lastPrice = prices[prices.length - 1];
    const up = stock.prevClose ? lastPrice >= stock.prevClose : true;
    const color = up ? "#668CF4" : "#fbbf24";

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
                        tickFormatter={(ts) => dayjs(ts).format("HH:mm")}
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
                        labelFormatter={(ts) => dayjs(ts).format("HH:mm:ss")}
                        formatter={(value) => [value.toFixed(2) + " kr", "Kurs"]}
                        contentStyle={{
                            background: "var(--color-foreground)",
                            border: "1px solid var(--color-border)",
                            fontSize: 12,
                            color: "var(--color-text)",
                        }}
                    />
                    {stock.prevClose && (
                        <ReferenceLine y={stock.prevClose} stroke="#6b7280" strokeDasharray="4 4" />
                    )}
                    <Area type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill="url(#stockFill)" dot={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function StockContent({ symbol }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    const load = async () => {
        try {
            const res = await fetchStock(symbol);
            if (res.stock) {
                setData(res);
                setError("");
            } else {
                setError(res.error || "Kunde inte hämta aktien");
            }
        } catch {
            setError("Kunde inte hämta aktien");
        }
    };

    useEffect(() => {
        setData(null);
        load();
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [symbol]);

    if (error) {
        return (
            <div className="py-16 text-center font-sans">
                <p className="text-text-muted mb-4">{error}</p>
                <Link href="/marknadsnyheter" className="text-primary underline">Till marknadsnyheterna</Link>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="animate-pulse flex flex-col gap-4 py-8">
                <div className="h-8 bg-border w-1/3"></div>
                <div className="h-64 bg-border w-full"></div>
            </div>
        );
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
                        <span className="text-xs text-text-muted mt-1">
                            Uppdaterad {dayjs(stock.dataAsOf).format("HH:mm:ss")}
                        </span>
                    </div>
                )}
            </div>

            <div className="border border-border bg-foreground p-4 mb-10">
                <StockGraph stock={stock} />
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
