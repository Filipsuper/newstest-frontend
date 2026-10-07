"use client";

import Link from "next/link";
import NewsTypeLabel from "./NewsTypeLabel";
import NewsSummary from "./NewsSummary";
import { newsDate, storyHref } from "../utils/newsroom";
import NewsRow from "./ui/NewsRow";
import { newsMarketContext, volumeRatioLabel } from "../utils/newsMarketAttention";
import { rowReaction } from "../utils/reactionV2";
import { sessionDateLabel } from "../utils/companySession";
import { newsPublicationSession } from '../utils/newsPublicationSession';
import NewsSessionLabel from './NewsSessionLabel';
import { newsCardHeadline } from '../utils/newsCardPreview';
import { newsDescription, newsEditorialLabel } from '../utils/newsSummary';
import { companyStoryHref } from '../utils/storyUrls';

export default function NewsFeedItem({
  item,
  showSymbol = true,
  highlighted = false,
  reason = null,
  showSummary = true,
  summaryPreview = false,
  compact = false,
  variant = showSummary ? "editorial" : "brief",
  metadataAction,
  className,
  onOpen,
}) {
  const marketContext = newsMarketContext(item);
  const description = newsDescription(item);
  const publisher = item.sourceExcerpt?.publisher ?? item.source;
  const editorialLabel = newsEditorialLabel(item);
  const reaction = rowReaction(item);
  const publicationSession = newsPublicationSession(item);
  const volume = reaction.measurement?.volume?.m30;
  const session = reaction.companySession;
  const sessionVolume = session?.relationship !== "before_event_session"
    ? Number.isFinite(session?.fields.rvolAtTime.value) ? session.fields.rvolAtTime
      : Number.isFinite(session?.fields.dailyRvol.value) ? session.fields.dailyRvol : null
    : null;
  const sameTime = sessionVolume === session?.fields.rvolAtTime;
  const mainTag =
    (item.labels ?? []).find((tag) => tag !== "REGULATORY") ?? item.labels?.[0];
  const editorial = variant === "editorial";
  const scan = variant === "scan" || editorial;
  const separated = scan || variant === "brief";
  const company = showSymbol ? (item.company ?? item.symbol) : null;
  const publicationTime = <time dateTime={Number.isFinite(item.ts) ? new Date(item.ts).toISOString() : undefined}>
      {newsDate(item.ts)}
    </time>;
  const publicationMetadata = <>
    {publicationTime}
    {editorialLabel && <span>{editorialLabel}</span>}
    {publisher && <span>{publisher}</span>}
  </>;

  return (
    <NewsRow
      className={className}
      highlighted={highlighted}
      compact={compact}
      variant={variant}
      identityLabel={separated && mainTag ? <NewsTypeLabel type={mainTag} /> : null}
      publicationMetadata={publicationMetadata}
      metadataAction={metadataAction}
      company={company}
      companyData={company ? item.companies?.find(member => member.symbol === item.symbol) ?? { symbol: item.symbol, name: company } : undefined}
      companyHref={company && item.symbol ? `/aktie/${encodeURIComponent(item.symbol)}` : undefined}
      title={separated ? newsCardHeadline(item.title, company) : item.title}
      description={
        showSummary && description ? (
          <NewsSummary {...description} preview={summaryPreview} compact={scan} />
        ) : null
      }
      reaction={reaction.pct}
      leadingLabel={publicationSession ? <NewsSessionLabel session={publicationSession} /> : null}
      href={onOpen ? undefined : item.readerCompany ? companyStoryHref(item.id, item.title, item.readerCompany) : storyHref(item.id, item.title)}
      onOpen={onOpen}
      reactionLabel={reaction.pct !== null ? reaction.label : reaction.status ?? "Nyhet"}
      metadata={
        <>
          {!editorial && publicationTime}
          {item.relatedCompany && <span>Berör även {item.relatedCompany}</span>}
          {reaction.pct !== null && <NewsSessionLabel session={publicationSession} />}
          {!compact && !separated && mainTag && <NewsTypeLabel type={mainTag} />}
          {reaction.pct !== null && (!scan || reaction.scope === "session") && <span>{reaction.label}</span>}
          {reaction.version === 2 && reaction.pct === null && <span>{reaction.status}</span>}
          {!compact && sessionVolume && <span title={`Bolagets kumulativa handel per ${newsDate(sessionVolume.at)}. Inte volym orsakad av nyheten.${sameTime && !session.baselineMature ? " Preliminärt jämförelseunderlag." : ""}`}>
            {scan ? "Volym" : "RVOL"} {volumeRatioLabel(sessionVolume.value)}{sameTime && !session.baselineMature ? "*" : ""} · {sameTime ? "samma tid" : scan ? "normal heldag" : "mot heldag"} · {sessionDateLabel(session)}
          </span>}
          {!compact && !sessionVolume && reaction.scope !== "session" && reaction.version === 2 && ["measured", "missing_baseline"].includes(reaction.measurement?.status)
            && volume?.post?.status === "complete" && volume.baselineMature
            && Number.isFinite(volume.relativeToNormal) && (
            <span title="Volym under 30 hela minuter efter nyheten eller nästa öppning, jämfört med samma tid tidigare handelsdagar.">
              Volym {volumeRatioLabel(volume.relativeToNormal)} · 30 min
            </span>
          )}
          {!compact && !sessionVolume && reaction.version === 1 && marketContext?.baselineMature && marketContext.rvolAtTime !== null && (
            <span title={`Bolagets volym jämfört med normal volym vid samma tid. Data per ${newsDate(marketContext.asOf)}; inte volym orsakad av nyheten.`}>
              Volym {volumeRatioLabel(marketContext.rvolAtTime)} kl. {newsDate(marketContext.asOf, { day: undefined, month: undefined })}
            </span>
          )}
          {!editorial && editorialLabel && <span>{editorialLabel}</span>}
          {!editorial && publisher && <span>{publisher}</span>}
          {reason && <span>{reason}</span>}
          {!compact && (item.sourceCount ?? 0) > 1 && (
            <span>{item.sourceCount} källor</span>
          )}
          {!compact && !separated && showSymbol && item.symbol && (
            <Link href={`/aktie/${encodeURIComponent(item.symbol)}`}>
              {item.symbol.replace(".ST", "")}
            </Link>
          )}
        </>
      }
    />
  );
}
