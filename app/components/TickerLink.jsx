"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Session-wide spark cache: one fetch per symbol no matter how many hovers
const sparkCache = new Map();

const getSpark = (symbol) => {
    if (!sparkCache.has(symbol)) {
        const promise = fetch(`${API_URL}/feed/spark/${encodeURIComponent(symbol)}`)
            .then((res) => res.json())
            .catch(() => {
                sparkCache.delete(symbol);
                return null;
            });
        sparkCache.set(symbol, promise);
    }
    return sparkCache.get(symbol);
};

function MiniChart({ points }) {
    const w = 208;
    const h = 56;
    const values = points.map((p) => p[1]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = w / (points.length - 1 || 1);
    const coords = points.map(
        (p, i) => `${(i * step).toFixed(1)},${(h - 4 - ((p[1] - min) / span) * (h - 8)).toFixed(1)}`
    );
    const up = values[values.length - 1] >= values[0];
    const color = up ? "#668CF4" : "#fbbf24";

    return (
        <svg width={w} height={h} className="block">
            <polyline
                points={`${coords.join(" ")}`}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <polygon
                points={`0,${h} ${coords.join(" ")} ${w},${h}`}
                fill={color}
                opacity="0.08"
            />
        </svg>
    );
}

export default function TickerLink({ symbol, children }) {
    const [open, setOpen] = useState(false);
    const [spark, setSpark] = useState(null);
    const timer = useRef(null);

    const handleEnter = () => {
        timer.current = setTimeout(async () => {
            setOpen(true);
            const data = await getSpark(symbol);
            setSpark(data);
        }, 150);
    };

    const handleLeave = () => {
        clearTimeout(timer.current);
        setOpen(false);
    };

    const label = symbol.replace(".ST", "").replaceAll("-", " ");
    const up = (spark?.changePct ?? 0) >= 0;

    return (
        <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <Link
                href={`/aktie/${encodeURIComponent(symbol)}`}
                className="font-bold underline decoration-dotted decoration-text-muted underline-offset-2 hover:text-primary transition-colors"
            >
                {children}
            </Link>
            {open && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 block w-60 bg-foreground border border-border p-3 shadow-xl font-sans not-italic">
                    {spark?.points?.length >= 2 ? (
                        <>
                            <span className="flex flex-row justify-between items-baseline mb-2">
                                <span className="text-xs font-semibold text-text">{label}</span>
                                <span className={`text-xs font-semibold ${up ? "text-primary" : "text-secondary"}`}>
                                    {up ? "+" : ""}{spark.changePct.toFixed(1)}%
                                </span>
                            </span>
                            <MiniChart points={spark.points} />
                            <span className="flex flex-row justify-between items-center mt-1.5">
                                <span className="text-[10px] uppercase tracking-wide text-text-muted">1 månad</span>
                                <span className="text-[10px] text-primary">Visa aktie →</span>
                            </span>
                        </>
                    ) : spark ? (
                        <span className="text-xs text-text-muted">Ingen kursdata</span>
                    ) : (
                        <span className="text-xs text-text-muted">Laddar…</span>
                    )}
                </span>
            )}
        </span>
    );
}
