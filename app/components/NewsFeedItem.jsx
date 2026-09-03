"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { tagLabel } from "../utils/newsTags";
import { useModal } from "../providers/ModalProvider";
import NewsModal from "./NewsModal";

const reactionLabel = (value) => `${value >= 0 ? "+" : ""}${Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})}%`;

export default function NewsFeedItem({ item, showSymbol = true, highlighted = false, reason = null }) {
    const { openModal } = useModal();
    const time = dayjs(item.ts);
    const hasTime = time.isValid();
    const isToday = hasTime && time.isSame(dayjs(), "day");
    const reaction = Number.isFinite(item.reaction?.pct) ? item.reaction.pct : null;
    const mainTag = (item.labels ?? []).find((tag) => tag !== "REGULATORY") ?? item.labels?.[0];

    return (
        <article id={`news-${item.id}`} className={`news-stream-row ${highlighted ? "is-highlighted" : ""}`}>
            <span className={`market-move-badge ${reaction == null ? "is-neutral" : reaction >= 0 ? "is-positive" : "is-negative"}`}>
                {reaction == null ? "Nyhet" : reactionLabel(reaction)}
            </span>
            <div className="news-stream-row__body">
                <button type="button" onClick={() => openModal(<NewsModal item={item} />)}>
                    {showSymbol && (item.company || item.symbol) && <strong>{item.company ?? item.symbol}</strong>}
                    {showSymbol && (item.company || item.symbol) && <span aria-hidden="true"> — </span>}
                    <span>{item.title}</span>
                </button>
                <div className="news-stream-row__meta">
                    <time dateTime={Number.isFinite(item.ts) ? new Date(item.ts).toISOString() : undefined}>
                        {hasTime ? (isToday ? time.format("HH:mm") : time.format("D MMM HH:mm")) : "Tid saknas"}
                    </time>
                    {mainTag && <span>{tagLabel(mainTag)}</span>}
                    {reason && <span className="news-stream-row__reason">{reason}</span>}
                    {(item.sourceCount ?? 0) > 1 && <span>{item.sourceCount} källor</span>}
                    {showSymbol && item.symbol && (
                        <Link href={`/aktie/${encodeURIComponent(item.symbol)}`}>
                            {item.symbol.replace(".ST", "")}
                        </Link>
                    )}
                </div>
            </div>
        </article>
    );
}
