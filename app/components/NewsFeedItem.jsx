"use client";

import Link from "next/link";
import { tagLabel } from "../utils/newsTags";
import { newsDate, storyHref } from "../utils/newsroom";
import NewsRow from "./ui/NewsRow";

export default function NewsFeedItem({
  item,
  showSymbol = true,
  highlighted = false,
  reason = null,
}) {
  const reaction = Number.isFinite(item.reaction?.pct)
    ? item.reaction.pct
    : null;
  const mainTag =
    (item.labels ?? []).find((tag) => tag !== "REGULATORY") ?? item.labels?.[0];

  return (
    <NewsRow
      highlighted={highlighted}
      company={showSymbol ? (item.company ?? item.symbol) : null}
      title={item.title}
      reaction={reaction}
      href={storyHref(item.id)}
      reactionLabel="Sedan publicering"
      metadata={
        <>
          <time
            dateTime={
              Number.isFinite(item.ts)
                ? new Date(item.ts).toISOString()
                : undefined
            }
          >
            {newsDate(item.ts)}
          </time>
          {mainTag && <span>{tagLabel(mainTag)}</span>}
          {reaction !== null && <span>Sedan publicering</span>}
          {item.source && <span>{item.source}</span>}
          {reason && <span>{reason}</span>}
          {(item.sourceCount ?? 0) > 1 && (
            <span>{item.sourceCount} källor</span>
          )}
          {showSymbol && item.symbol && (
            <Link href={`/aktie/${encodeURIComponent(item.symbol)}`}>
              {item.symbol.replace(".ST", "")}
            </Link>
          )}
        </>
      }
    />
  );
}
