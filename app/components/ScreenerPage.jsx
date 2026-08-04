"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchScreener } from "../utils/api";
import { tagLabel, tagColor } from "../utils/newsTags";
import PlusPaywall from "./PlusPaywall";

const REFRESH_MS = 60_000;

const ORDERS = [
    { id: "absolute", label: "Störst rörelse" },
    { id: "gainers", label: "Vinnare" },
    { id: "losers", label: "Förlorare" },
];

function ScreenerTable() {
    const [order, setOrder] = useState("absolute");
    const [items, setItems] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const res = await fetchScreener(order, 20);
                if (!active) return;
                if (res.error) setError(res.error);
                else {
                    setItems(res.items ?? []);
                    setError(null);
                }
            } catch {
                if (active) setError("Kunde inte hämta dagens rörelser.");
            }
        };

        setItems(null);
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [order]);

    return (
        <>
            <div className="flex flex-row gap-1 mb-6 font-sans text-xs">
                {ORDERS.map((o) => (
                    <button
                        key={o.id}
                        onClick={() => setOrder(o.id)}
                        className={`px-2 py-1 cursor-pointer transition-colors ${order === o.id
                            ? "text-text border-b-2 border-secondary"
                            : "text-text-muted hover:text-text"}`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>

            {error && <p className="text-red-500 font-sans text-sm mb-4">{error}</p>}

            {items == null ? (
                <div className="flex flex-col gap-4 py-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="animate-pulse flex flex-row gap-4">
                            <div className="h-5 bg-border w-1/4"></div>
                            <div className="h-5 bg-border w-16"></div>
                            <div className="h-5 bg-border w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <p className="text-text-muted font-sans py-8">Inga rörelser att visa ännu.</p>
            ) : (
                <div className="flex flex-col divide-y divide-border font-sans">
                    {items.map((row) => {
                        const up = (row.changePct ?? 0) >= 0;
                        return (
                            <div key={row.symbol} className="flex flex-col md:flex-row md:items-center gap-x-6 gap-y-1 py-3">
                                <div className="flex flex-row items-baseline justify-between md:w-72 shrink-0">
                                    <Link
                                        href={`/aktie/${encodeURIComponent(row.symbol)}`}
                                        className="text-sm font-semibold text-text-article hover:text-text hover:underline truncate pr-3"
                                    >
                                        {row.name ?? row.symbol}
                                    </Link>
                                    <span className="flex flex-row gap-3 items-baseline shrink-0">
                                        <span className="text-xs text-text-muted">{row.price?.toFixed(2)}</span>
                                        <span className={`text-sm font-semibold w-16 text-right ${up ? "text-primary" : "text-secondary"}`}>
                                            {up ? "+" : ""}{row.changePct?.toFixed(2)}%
                                        </span>
                                    </span>
                                </div>
                                <div className="flex flex-row items-center gap-2 min-w-0">
                                    {row.news ? (
                                        <>
                                            {(row.news.tags ?? []).slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className={`border px-1.5 py-0.5 uppercase tracking-wide text-[10px] shrink-0 ${tagColor(tag)}`}
                                                >
                                                    {tagLabel(tag)}
                                                </span>
                                            ))}
                                            <Link
                                                href={`/aktie/${encodeURIComponent(row.symbol)}`}
                                                className="text-xs text-text-muted truncate hover:text-text hover:underline"
                                            >
                                                {row.news.headline}
                                            </Link>
                                        </>
                                    ) : (
                                        <span className="text-xs text-text-muted/60">Ingen nyhet kopplad</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

export default function ScreenerPage() {
    return (
        <main className="min-h-[80vh] mx-auto max-w-4xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-text mb-2">Screener</h1>
                <p className="text-text-muted font-sans">
                    Dagens rörelser på Stockholmsbörsen – med nyheten som förklarar dem.
                </p>
            </div>
            <PlusPaywall redirectTo="/screener">
                <ScreenerTable />
            </PlusPaywall>
        </main>
    );
}
