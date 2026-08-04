"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { tagLabel, tagColor } from "../utils/newsTags";
import { useModal } from "../providers/ModalProvider";
import NewsModal from "./NewsModal";

export default function NewsFeedItem({ item, showSymbol = true, highlighted = false }) {
    const { openModal } = useModal();
    const time = dayjs(item.ts);
    const isToday = time.isSame(dayjs(), "day");

    return (
        <article
            id={`news-${item.id}`}
            className={`py-5 transition-colors duration-700 ${highlighted ? "bg-bullet" : ""}`}
        >
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 mb-2 font-sans text-xs">
                <span className="text-text-muted font-semibold">
                    {isToday ? time.format("HH:mm") : time.format("D MMM HH:mm")}
                </span>
                {(item.labels ?? []).slice(0, 3).map((tag) => (
                    <span key={tag} className={`border px-1.5 py-0.5 uppercase tracking-wide text-[10px] ${tagColor(tag)}`}>
                        {tagLabel(tag)}
                    </span>
                ))}
                {showSymbol && item.symbol && (
                    <Link
                        href={`/aktie/${encodeURIComponent(item.symbol)}`}
                        className="text-primary border border-border px-1.5 py-0.5 hover:bg-primary hover:text-background transition-colors"
                    >
                        {item.company ?? item.symbol}
                    </Link>
                )}
                {Number.isFinite(item.reaction?.pct) && (
                    <span
                        title="Kursreaktion sedan nyheten publicerades"
                        className={`font-semibold ${item.reaction.pct >= 0 ? "text-primary" : "text-secondary"}`}
                    >
                        {item.reaction.pct >= 0 ? "+" : ""}{item.reaction.pct.toFixed(2)}%
                    </span>
                )}
            </div>
            <button
                onClick={() => openModal(<NewsModal item={item} />)}
                className="text-left cursor-pointer group"
            >
                <h3 className="text-lg font-serif font-bold italic text-text group-hover:underline mb-1">
                    {item.title}
                </h3>
            </button>
            {item.summary && (
                <p className="text-sm font-sans text-text-muted leading-relaxed line-clamp-3">
                    {item.summary}
                </p>
            )}
        </article>
    );
}
