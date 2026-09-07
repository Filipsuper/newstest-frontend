"use client";

import Link from "next/link";
import NewsTypeLabel from "./NewsTypeLabel";
import NewsSummary from "./NewsSummary";
import { newsDate, storyHref } from "../utils/newsroom";
import NewsRow from "./ui/NewsRow";

export default function NewsFeedItem({
  item,
  showSymbol = true,
  highlighted = false,
  reason = null,
  showSummary = true,
  summaryPreview = false,
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
      description={
        showSummary ? (
          <NewsSummary value={item.aiSummary} preview={summaryPreview} />
        ) : null
      }
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
          {mainTag && <NewsTypeLabel type={mainTag} />}
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
