"use client";

import Link from "next/link";
import NewsTypeLabel from "./NewsTypeLabel";
import NewsSummary from "./NewsSummary";
import { newsDate, storyHref } from "../utils/newsroom";
import NewsRow from "./ui/NewsRow";
import { newsMarketContext, volumeRatioLabel } from "../utils/newsMarketAttention";
import { rowReaction } from "../utils/reactionV2";
import { sessionDateLabel } from "../utils/companySession";

export default function NewsFeedItem({
  item,
  showSymbol = true,
  highlighted = false,
  reason = null,
  showSummary = true,
  summaryPreview = false,
  onOpen,
}) {
  const marketContext = newsMarketContext(item);
  const reaction = rowReaction(item);
  const volume = reaction.measurement?.volume?.m30;
  const session = reaction.companySession;
  const sessionVolume = session?.relationship !== "before_event_session"
    ? Number.isFinite(session?.fields.rvolAtTime.value) ? session.fields.rvolAtTime
      : Number.isFinite(session?.fields.dailyRvol.value) ? session.fields.dailyRvol : null
    : null;
  const sameTime = sessionVolume === session?.fields.rvolAtTime;
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
      reaction={reaction.pct}
      href={onOpen ? undefined : storyHref(item.id)}
      onOpen={onOpen}
      reactionLabel={reaction.pct !== null ? reaction.label : reaction.status ?? "Nyhet"}
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
          {reaction.pct !== null && <span>{reaction.label}</span>}
          {reaction.version === 2 && reaction.pct === null && <span>{reaction.status}</span>}
          {sessionVolume && <span title={`Bolagets kumulativa handel per ${newsDate(sessionVolume.at)}. Inte volym orsakad av nyheten.${sameTime && !session.baselineMature ? " Preliminärt jämförelseunderlag." : ""}`}>
            RVOL {volumeRatioLabel(sessionVolume.value)}{sameTime && !session.baselineMature ? "*" : ""} · {sameTime ? "samma tid" : "mot heldag"} · {sessionDateLabel(session)}
          </span>}
          {!sessionVolume && reaction.scope !== "session" && reaction.version === 2 && ["measured", "missing_baseline"].includes(reaction.measurement?.status)
            && volume?.post?.status === "complete" && volume.baselineMature
            && Number.isFinite(volume.relativeToNormal) && (
            <span title="Volym under 30 hela minuter efter nyheten eller nästa öppning, jämfört med samma tid tidigare handelsdagar.">
              Volym {volumeRatioLabel(volume.relativeToNormal)} · 30 min
            </span>
          )}
          {!sessionVolume && reaction.version === 1 && marketContext?.baselineMature && marketContext.rvolAtTime !== null && (
            <span title={`Bolagets volym jämfört med normal volym vid samma tid. Data per ${newsDate(marketContext.asOf)}; inte volym orsakad av nyheten.`}>
              Volym {volumeRatioLabel(marketContext.rvolAtTime)} kl. {newsDate(marketContext.asOf, { day: undefined, month: undefined })}
            </span>
          )}
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
