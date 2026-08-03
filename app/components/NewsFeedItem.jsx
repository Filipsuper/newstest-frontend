"use client";

import Link from "next/link";
import dayjs from "dayjs";

const sourceLabel = {
    mfn: "MFN",
    cision: "Cision",
    fi: "FI",
    nasdaq: "Nasdaq",
    riksbank: "Riksbanken",
};

export default function NewsFeedItem({ item, showSymbol = true }) {
    const time = dayjs(item.ts);
    const isToday = time.isSame(dayjs(), "day");

    return (
        <article className="border-b border-border py-5">
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 mb-2 font-sans text-xs">
                <span className="text-text-muted font-semibold">
                    {isToday ? time.format("HH:mm") : time.format("D MMM HH:mm")}
                </span>
                <span className="text-text-muted uppercase tracking-wide">
                    {sourceLabel[item.source] ?? item.source}
                </span>
                {item.regulatory && (
                    <span className="text-secondary border border-secondary px-1.5 py-0.5">Regulatorisk</span>
                )}
                {showSymbol && item.symbol && (
                    <Link
                        href={`/aktie/${encodeURIComponent(item.symbol)}`}
                        className="text-primary border border-border px-1.5 py-0.5 hover:bg-primary hover:text-background transition-colors"
                    >
                        {item.company ?? item.symbol}
                    </Link>
                )}
            </div>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="group">
                <h3 className="text-lg font-serif font-bold italic text-text group-hover:underline mb-1">
                    {item.title}
                </h3>
            </a>
            {item.summary && (
                <p className="text-sm font-sans text-text-muted leading-relaxed line-clamp-3">
                    {item.summary}
                </p>
            )}
        </article>
    );
}
