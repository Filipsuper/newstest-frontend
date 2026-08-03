"use client";

import Link from "next/link";
import dayjs from "dayjs";

export default function NewsFeedItem({ item, showSymbol = true }) {
    const time = dayjs(item.ts);
    const isToday = time.isSame(dayjs(), "day");

    return (
        <article className="border-b border-border py-5">
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 mb-2 font-sans text-xs">
                <span className="text-text-muted font-semibold">
                    {isToday ? time.format("HH:mm") : time.format("D MMM HH:mm")}
                </span>
                {showSymbol && item.symbol && (
                    <Link
                        href={`/aktie/${encodeURIComponent(item.symbol)}`}
                        className="text-primary border border-border px-1.5 py-0.5 hover:bg-primary hover:text-background transition-colors"
                    >
                        {item.company ?? item.symbol}
                    </Link>
                )}
            </div>
            {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="group">
                    <h3 className="text-lg font-serif font-bold italic text-text group-hover:underline mb-1">
                        {item.title}
                    </h3>
                </a>
            ) : (
                <h3 className="text-lg font-serif font-bold italic text-text mb-1">{item.title}</h3>
            )}
            {item.summary && (
                <p className="text-sm font-sans text-text-muted leading-relaxed line-clamp-3">
                    {item.summary}
                </p>
            )}
        </article>
    );
}
