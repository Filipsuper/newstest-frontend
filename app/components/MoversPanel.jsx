"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMovers } from "../utils/api";

const REFRESH_MS = 60_000;

function MoverColumn({ title, items }) {
    return (
        <div>
            <span className="text-[11px] uppercase tracking-wider text-text-muted">{title}</span>
            <div className="flex flex-col mt-2">
                {items.map((row) => {
                    const up = (row.changePct ?? 0) >= 0;
                    return (
                        <Link
                            key={row.symbol}
                            href={`/aktie/${encodeURIComponent(row.symbol)}`}
                            className="flex flex-row justify-between items-baseline py-1.5 group"
                        >
                            <span className="text-sm text-text-article group-hover:text-text group-hover:underline truncate pr-3">
                                {row.name ?? row.symbol}
                            </span>
                            <span className="flex flex-row gap-3 items-baseline shrink-0">
                                <span className="text-xs text-text-muted">{row.price?.toFixed(2)}</span>
                                <span className={`text-sm font-semibold w-16 text-right ${up ? "text-primary" : "text-secondary"}`}>
                                    {up ? "+" : ""}{row.changePct?.toFixed(2)}%
                                </span>
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default function MoversPanel() {
    const [gainers, setGainers] = useState(null);
    const [losers, setLosers] = useState(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const [g, l] = await Promise.all([fetchMovers("gainers", 5), fetchMovers("losers", 5)]);
                if (!active) return;
                setGainers(g.items ?? []);
                setLosers(l.items ?? []);
            } catch {
                // panel is optional — fail silently
            }
        };

        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, []);

    if (!gainers || !losers || (gainers.length === 0 && losers.length === 0)) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10 font-sans">
            <MoverColumn title="Dagens vinnare" items={gainers} />
            <MoverColumn title="Dagens förlorare" items={losers} />
        </div>
    );
}
