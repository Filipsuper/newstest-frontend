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
import { reactionGeometry } from "../utils/reactionGeometry";
import { tagLabel } from "../utils/newsTags";
import { Button } from "./ui/Button";
import { Badge, ChangeBadge, EmptyState, Skeleton } from "./ui/data";
import { Heading, Inline, Stack, Text } from "./ui/layout";
import FollowCompanyButton from "./FollowCompanyButton";
import NewsFeedItem from "./NewsFeedItem";
import styles from "./story-reader.module.css";

const metricNames = {
  revenue: "Omsättning",
  net_sales: "Nettoomsättning",
  ebit: "EBIT",
  ebita: "EBITA",
  ebitda: "EBITDA",
  operating_profit: "Rörelseresultat",
  net_profit: "Nettoresultat",
  eps: "Vinst per aktie",
  cash_flow: "Kassaflöde",
  order_intake: "Orderingång",
  dividend: "Utdelning",
};
const windows = [
  ["Första avslut", "tickPct"],
  ["1 minut", "m1Pct"],
  ["5 minuter", "m5Pct"],
  ["15 minuter", "m15Pct"],
  ["1 timme", "h1Pct"],
  ["1 dag", "d1Pct"],
];

export function ReactionChart({ series, publishedAt }) {
  const geometry = reactionGeometry(series, publishedAt);
  if (!geometry)
    return (
      <Text size="sm" tone="secondary">
        Kurskurvan visas när det finns tillräckligt med handel kring
        publiceringen.
      </Text>
    );
  const { points, width, height, path, area, zero, marker } = geometry;
  const tone =
    points.at(-1).pct < 0 ? "var(--ui-negative)" : "var(--ui-positive)";
  return (
    <figure className={styles.chart}>
      <div className={styles.plot}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Kursutveckling runt publiceringen, procent mot senaste avslut före nyheten"
        >
          <line
            x1="44"
            x2={width - 16}
            y1={zero}
            y2={zero}
            stroke="var(--ui-border)"
          />
          <path d={area} fill={tone} opacity="0.08" />
          <path
            d={path}
            fill="none"
            stroke={tone}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {marker !== null && (
            <line
              x1={marker}
              x2={marker}
              y1="18"
              y2={height - 30}
              stroke="var(--ui-text-secondary)"
              strokeDasharray="4 5"
            />
          )}
        </svg>
        <span
          className={styles.zeroLabel}
          style={{ top: `${(zero / height) * 100}%` }}
        >
          0%
        </span>
        {marker !== null && (
          <span
            className={styles.publishLabel}
            style={{
              left: `clamp(44px, ${(marker / width) * 100}%, calc(100% - 90px))`,
            }}
          >
            Publicering
          </span>
        )}
      </div>
      <div className={styles.chartAxis}>
        <span>{newsDate(points[0].t)}</span>
        <span>{newsDate(points.at(-1).t)}</span>
      </div>
      <figcaption>
        Baslinje: senaste avslut före publicering. Kurvan visar ett tidsmässigt
        samband, inte bevis på orsak.
      </figcaption>
    </figure>
  );
}

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
        if (active) setDetail(value);
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
  const reaction = finiteNumber(story.reaction?.pct);
  const sources = story.sources ?? [];
  const facts = story.facts ?? {};
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
          <Badge>
            {tagLabel(
              (story.labels ?? []).find((tag) => tag !== "REGULATORY") ||
                "NEWS",
            )}
          </Badge>
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
        {story.summary && (
          <Text className={styles.summary}>{story.summary}</Text>
        )}
        <section
          className={styles.reaction}
          aria-labelledby="story-reaction-heading"
        >
          <Inline className={styles.between}>
            <Heading id="story-reaction-heading" size="subsection">
              Marknadens reaktion
            </Heading>
            <Inline>
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
          <ReactionChart
            series={detail?.reactionSeries}
            publishedAt={published}
          />
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
        </section>
        {facts.reportMetrics?.length > 0 && (
          <section>
            <Heading size="subsection">Rapporten i siffror</Heading>
            <dl className={styles.metrics}>
              {facts.reportMetrics.map((metric, index) => (
                <div key={`${metric.key}-${index}`}>
                  <dt>
                    {metricNames[metric.key] || metric.label || metric.key}
                  </dt>
                  <dd>{metric.value ?? "Saknas"}</dd>
                </div>
              ))}
            </dl>
            <Text size="xs" tone="secondary">
              Uppgifter ur bolagets rapport. Eventuella jämförelsetal visas inom
              parentes.
            </Text>
          </section>
        )}
        {facts.estimateComparisons?.length > 0 && (
          <details className={styles.details}>
            <summary>Utfall mot förväntan</summary>
            <Stack gap={3}>
              {facts.estimateComparisons.map((row, index) => (
                <Text size="sm" key={index}>
                  {metricNames[row.key] || row.label || row.key}:{" "}
                  {row.actualDisplay ?? row.actualAmount ?? "Saknas"} mot{" "}
                  {row.estimateDisplay ?? row.estimateAmount ?? "Saknas"}
                  {row.source && ` · ${row.source}`}
                </Text>
              ))}
            </Stack>
          </details>
        )}
        {facts.transactions?.length > 0 && (
          <details className={styles.details}>
            <summary>Insynstransaktioner</summary>
            <Stack gap={3}>
              {facts.transactions.map((row, index) => (
                <Text size="sm" key={index}>
                  {row.person}
                  {row.position && ` · ${row.position}`}
                  <br />
                  {row.nature === "Acquisition"
                    ? "Köp"
                    : row.nature === "Disposal"
                      ? "Försäljning"
                      : row.nature}
                  {row.volume != null &&
                    ` · ${row.volume.toLocaleString("sv-SE")} aktier`}
                  {row.price != null &&
                    ` à ${row.price.toLocaleString("sv-SE")} ${row.currency || ""}`}
                  {row.transactionDate && ` · ${row.transactionDate}`}
                </Text>
              ))}
            </Stack>
          </details>
        )}
        {facts.money?.display && (
          <Text size="sm">Belopp: {facts.money.display}</Text>
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
          <Link className={styles.company} href="/bevakning">
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
