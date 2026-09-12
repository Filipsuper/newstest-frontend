"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowUpRight, FiCheck, FiCopy, FiShare2 } from "react-icons/fi";
import { fetchStory, fetchRelatedStories } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import {
  normalizeStory,
  finiteNumber,
  newsDate,
  storyHref,
} from "../utils/newsroom";
import { reactionV2For, retainReactionV2 } from "../utils/reactionV2";
import { companyContextFor, retainCompanyContext } from "../utils/companySession";
import NewsTypeLabel from "./NewsTypeLabel";
import NewsSummary from "./NewsSummary";
import { Button } from "./ui/Button";
import { ChangeBadge, EmptyState, Skeleton } from "./ui/data";
import { Heading, Inline, Stack, Text } from "./ui/layout";
import FollowCompanyButton from "./FollowCompanyButton";
import NewsFeedItem from "./NewsFeedItem";
import StoryVolume from "./StoryVolume";
import StoryReaction from "./StoryReaction";
import StoryStockHistory from "./StoryStockHistory";
import styles from "./story-reader.module.css";

const windows = [
  ["Första avslut", "tickPct"],
  ["1 minut", "m1Pct"],
  ["5 minuter", "m5Pct"],
  ["15 minuter", "m15Pct"],
  ["1 timme", "h1Pct"],
  ["1 dag", "d1Pct"],
];

export { default as ReactionChart } from "./ReactionChart";

export default function StoryReader({
  storyId,
  initialDetail = null,
  initialStory = null,
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [loading, setLoading] = useState(!initialDetail);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const [related, setRelated] = useState([]);
  useEffect(() => {
    let active = true;
    fetchRelatedStories(storyId)
      .then((items) => {
        if (active) setRelated(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storyId]);
  useEffect(() => {
    if (initialDetail && retry === 0) return;
    let active = true;
    setLoading(true);
    setError("");
    fetchStory(storyId)
      .then((value) => {
        if (active) setDetail(previous => {
          const fresh = value.story ?? value;
          const reactionV2 = retainReactionV2(previous?.story ?? previous ?? initialStory, fresh);
          const companyContext = retainCompanyContext(previous?.story ?? previous ?? initialStory, fresh);
          return value.story ? { ...value, story: { ...fresh, reactionV2, companyContext } } : { ...value, reactionV2, companyContext };
        });
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storyId, initialDetail, retry]);
  const story = normalizeStory(
    detail?.story ?? (detail?.headline ? detail : initialStory) ?? {},
  );
  const hasStory = Boolean(story.id);
  const hasReactionV2 = Boolean(reactionV2For(story));
  const hasCompanyContext = Boolean(companyContextFor(story)?.companies.length);
  useEffect(() => {
    // A newly published story may acquire its first observation after opening.
    // Keep retrying optional enrichment while the reader is visible.
    if (!hasStory) return;
    const refresh = () => { if (document.visibilityState === "visible") setRetry(value => value + 1); };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [story.id, hasStory]);
  const reaction = finiteNumber(story.reaction?.pct);
  const sources = story.sources ?? [];
  const release = detail?.document;
  const published = Number.isFinite(story.ts)
    ? new Date(story.ts).toISOString()
    : null;
  const shareUrl = `https://omxsum.com${storyHref(storyId)}`;
  async function share(copy = false) {
    setShareError("");
    try {
      if (!copy && navigator.share)
        await navigator.share({ title: story.title, url: shareUrl });
      else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
      }
    } catch (error) {
      if (error.name !== "AbortError")
        setShareError("Länken kunde inte kopieras. Kopiera adressen nedan.");
    }
  }
  if (loading && !hasStory)
    return (
      <Stack gap={4} aria-label="Hämtar nyheten" aria-busy="true">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </Stack>
    );
  if (!hasStory)
    return (
      <EmptyState
        role="alert"
        title={error || "Nyheten är inte tillgänglig"}
        description="Försök igen eller gå tillbaka till nyhetsflödet."
        action={
          <Button onClick={() => setRetry((value) => value + 1)}>
            Försök igen
          </Button>
        }
      />
    );
  return (
    <article className={styles.reader}>
      <Stack gap={6}>
        <Inline gap={3}>
          <NewsTypeLabel
            type={
              (story.labels ?? []).find((tag) => tag !== "REGULATORY") || "NEWS"
            }
          />
          <Text
            as="time"
            dateTime={published ?? undefined}
            size="xs"
            tone="secondary"
          >
            {newsDate(story.ts)}
          </Text>
          {sources[0] && (
            <Text as="span" size="xs" tone="secondary">
              {sources[0].publisher || sources[0].name}
            </Text>
          )}
        </Inline>
        <Heading as="h1" size="page" className={styles.title}>
          {story.title}
        </Heading>
        <NewsSummary value={story.aiSummary} reading />
        {hasReactionV2 || hasCompanyContext ? <StoryReaction key={`${story.id}:${story.version}`} story={story} loading={loading} error={error} refreshKey={retry}
          onRefresh={() => setRetry(value => value + 1)} /> : <section
          className={styles.reaction}
          aria-labelledby="story-reaction-heading"
        >
          <Inline className={styles.between}>
            <Heading id="story-reaction-heading" size="subsection">
              Marknadens reaktion
            </Heading>
            <Inline>
              <Button size="sm" variant="ghost" disabled={loading} onClick={() => setRetry(value => value + 1)}>
                {loading ? "Hämtar data…" : "Uppdatera data"}
              </Button>
              <ChangeBadge
                value={reaction}
                fallback="Inväntar kursdata"
                label="Sedan publicering"
              />
              {reaction !== null && (
                <Text as="span" size="xs" tone="secondary">
                  sedan publicering
                </Text>
              )}
            </Inline>
          </Inline>
          <StoryStockHistory story={story} refreshKey={retry} />
          {error && <Text size="sm" role="alert">{error}</Text>}
          {story.reaction?.asOf && <Text size="xs" tone="secondary">Kurs per {newsDate(story.reaction.asOf)}</Text>}
          <StoryVolume story={story} comparison={detail?.volumeComparison} />
          {windows.some(
            ([, key]) => finiteNumber(story.reaction?.[key]) !== null,
          ) && (
            <details className={styles.details}>
              <summary>Fler mätperioder</summary>
              <dl className={styles.metrics}>
                {windows.map(
                  ([label, key]) =>
                    finiteNumber(story.reaction?.[key]) !== null && (
                      <div key={key}>
                        <dt>{label} efter publicering</dt>
                        <dd>
                          <ChangeBadge
                            value={finiteNumber(story.reaction[key])}
                          />
                        </dd>
                      </div>
                    ),
                )}
              </dl>
            </details>
          )}
        </section>}
        <Inline className={styles.actions}>
          {story.companies.slice(0, 2).map((company) => (
            <Inline key={company.symbol} gap={2}>
              <Link
                className={styles.company}
                href={`/aktie/${encodeURIComponent(company.symbol)}`}
              >
                {company.name || company.symbol}
                <FiArrowUpRight aria-hidden="true" />
              </Link>
              <FollowCompanyButton
                symbol={company.symbol}
                name={company.name}
              />
            </Inline>
          ))}
          <Button variant="ghost" size="sm" onClick={() => share()}>
            <FiShare2 aria-hidden="true" /> Dela nyheten
          </Button>
          <Button variant="ghost" size="sm" onClick={() => share(true)}>
            {copied ? (
              <FiCheck aria-hidden="true" />
            ) : (
              <FiCopy aria-hidden="true" />
            )}
            {copied ? "Länk kopierad" : "Kopiera länk"}
          </Button>
        </Inline>
        {shareError && (
          <Text size="sm" role="alert">
            {shareError} <a href={shareUrl}>{shareUrl}</a>
          </Text>
        )}
        {release?.body && (
          <details className={styles.details}>
            <summary>Läs hela källtexten</summary>
            {release.preamble && <Text>{release.preamble}</Text>}
            <div className={styles.release}>
              {release.body
                .split(/\n{2,}|\s+[•*]\s+/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <Text key={index}>{paragraph}</Text>
                ))}
            </div>
          </details>
        )}
        {error && (
          <Text role="alert" size="sm">
            {error}{" "}
            <Button
              variant="ghost"
              onClick={() => setRetry((value) => value + 1)}
            >
              Försök igen
            </Button>
          </Text>
        )}
        <section className={styles.sources} aria-label="Nyhetens källor">
          <Text size="xs" tone="secondary">
            Källor & underlag
          </Text>
          <Inline>
            {sources.length ? (
              sources.map((source, index) =>
                source.url ? (
                  <Button
                    key={index}
                    variant="secondary"
                    size="sm"
                    nativeButton={false}
                    render={
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    {source.publisher || source.name || "Läs original"}
                    <FiArrowUpRight aria-hidden="true" />
                  </Button>
                ) : (
                  <Text key={index} size="sm">
                    {source.name}
                  </Text>
                ),
              )
            ) : (
              <Text size="sm" tone="secondary">
                Källhänvisning saknas.
              </Text>
            )}
          </Inline>
        </section>
        <Inline className={styles.between}>
          <Link className={styles.company} href="/marknaden/nyheter">
            Fortsätt till nyhetsflödet <FiArrowUpRight aria-hidden="true" />
          </Link>
          <Link className={styles.company} href="/marknaden/bevakning">
            Dina bevakningar <FiArrowUpRight aria-hidden="true" />
          </Link>
        </Inline>
        {related.length > 0 && (
          <Stack as="section" gap={4}>
            <Heading size="subsection">Fler nyheter om bolaget</Heading>
            {related.map((story) => (
              <NewsFeedItem key={story.id} item={storyToItem(story)} />
            ))}
          </Stack>
        )}
      </Stack>
    </article>
  );
}
