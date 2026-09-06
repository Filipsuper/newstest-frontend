"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowDown, FiArrowRight, FiPause, FiPlay } from "react-icons/fi";
import { fetchAllArticles, fetchMarketOverview } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import {
  chronologicalNews,
  featuredNews,
  finiteNumber,
  newsDate,
  pendingChanges,
} from "../utils/newsroom";
import { currentLetter, marketDateKey } from "../utils/letters";
import { MarketWorkspaceNav } from "./WorkspaceNav";
import { Button } from "./ui/Button";
import { ChangeBadge, EmptyState } from "./ui/data";
import { Container, Heading, Inline, Stack, Text, cx } from "./ui/layout";
import NewsFeedItem from "./NewsFeedItem";
import LetterPreview from "./LetterPreview";
import WatchPreview from "./WatchPreview";
import LiveNewsFeed from "./LiveNewsFeed";
import { useAuthContext } from "../providers/AuthProvider";
import styles from "./workspace.module.css";

const itemsFrom = (data) =>
  chronologicalNews(
    [
      ...(Array.isArray(data.news) ? data.news : (data.news?.items ?? [])),
      ...(data.moverNews ?? []),
    ]
      .filter((story) => story?.headline && story?.id)
      .map(storyToItem),
  );

function MarketStrip({ overview }) {
  return (
    <section className={styles.pulse} aria-label="Marknadsläge">
      {[
        ["omxspi", "OMXSPI"],
        ["omxs30", "OMXS30"],
        ["sp500", "S&P 500"],
      ].map(([id, name]) => {
        const index = (overview.benchmarks ?? []).find(
          (item) => item.id === id,
        );
        const values = (index?.session?.points ?? [])
          .filter(
            (point) => Array.isArray(point) && finiteNumber(point[1]) !== null,
          )
          .map((point) => Number(point[1]));
        const min = Math.min(...values),
          max = Math.max(...values);
        const path = values
          .map(
            (value, i) =>
              `${i ? "L" : "M"}${(i / Math.max(values.length - 1, 1)) * 72},${22 - ((value - min) / (max - min || 1)) * 20}`,
          )
          .join(" ");
        const bars = (index?.bars ?? []).filter(
          (bar) => finiteNumber(bar.close) !== null,
        );
        const previousClose = finiteNumber(bars.at(-2)?.close);
        const change =
          finiteNumber(index?.session?.changePct) ??
          (previousClose
            ? ((Number(bars.at(-1).close) - previousClose) / previousClose) *
              100
            : null);
        const session =
          index?.session?.date ||
          bars.at(-1)?.date ||
          marketDateKey(bars.at(-1)?.time);
        return (
          <div key={id} className={styles.index}>
            <div className={styles.indexText}>
              <strong>{name}</strong>
              <small>{session || "Kursdata saknas"}</small>
            </div>
            <ChangeBadge value={change} label={`${name}, senaste session`} />
            {values.length > 1 && (
              <svg
                viewBox="0 0 72 24"
                className={styles.indexChart}
                role="img"
                aria-label={`${name}, kursförlopp ${session}`}
              >
                <path
                  d={path}
                  fill="none"
                  stroke={
                    change < 0 ? "var(--ui-negative)" : "var(--ui-positive)"
                  }
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        );
      })}
      <div className={cx(styles.index, styles.breadth)}>
        <div className={styles.indexText}>
          <strong>Stockholmsbörsen</strong>
          <small>{overview.sessionDate || "Senaste session"}</small>
        </div>
        <Text size="xs" tone="secondary">
          {finiteNumber(overview.breadth?.rising) !== null &&
          finiteNumber(overview.breadth?.falling) !== null
            ? `${overview.breadth.rising} stiger · ${overview.breadth.falling} faller`
            : "Marknadsbredd saknas"}
        </Text>
      </div>
    </section>
  );
}

export default function MarketOverviewPage({
  overview = {},
  articles = [],
  referenceTime,
}) {
  const { isPlusUser } = useAuthContext();
  const [data, setData] = useState(overview);
  const [editions, setEditions] = useState(articles);
  const [pending, setPending] = useState(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(
    overview.unavailable ? "Marknadsläget kunde inte hämtas." : "",
  );
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() =>
    new Date(referenceTime || overview.generatedAt || 0).getTime(),
  );
  const [visibleItems, setVisibleItems] = useState(() => itemsFrom(overview));
  useEffect(() => {
    if (paused) return;
    let active = true,
      busy = false,
      count = 0;
    async function refresh() {
      if (!active || busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const next = await fetchMarketOverview();
        if (!active) return;
        setData(next);
        setNow(Date.now());
        setError(
          next.stale
            ? "Tillfälligt fördröjda data. Senaste tillgängliga uppgifter visas."
            : "",
        );
        const incoming = itemsFrom(next);
        if (!visibleItems.length) setVisibleItems(incoming);
        else if (pendingChanges(visibleItems, incoming).length)
          setPending(incoming);
        if (count++ % 4 === 0) {
          const letters = await fetchAllArticles();
          if (active && Array.isArray(letters)) setEditions(letters);
        }
      } catch {
        if (active)
          setError(
            "Uppdateringen misslyckades. Senaste tillgängliga uppgifter visas.",
          );
      } finally {
        busy = false;
      }
    }
    if (retry || !visibleItems.length) refresh();
    const timer = setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [paused, retry, visibleItems]);
  const featured = useMemo(
    () => featuredNews(visibleItems, now),
    [visibleItems, now],
  );
  const edition = currentLetter(editions, now);
  const latest = visibleItems[0];
  const pendingCount = pending
    ? pendingChanges(visibleItems, pending).length
    : 0;
  return (
    <Container as="main" className={styles.workspace}>
      <MarketWorkspaceNav foundation />
      <header className={styles.heading}>
        <Stack gap={2}>
          <Heading as="h1" size="page">
            Marknaden
          </Heading>
          <Text size="xs" tone="secondary">
            {marketDateKey(now)}
            {latest && ` · Senaste nyhet ${newsDate(latest.ts)}`}
          </Text>
        </Stack>
        <Inline>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<a href="#senaste-nytt" />}
          >
            Senaste nytt <FiArrowDown aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
          >
            {paused ? (
              <FiPlay aria-hidden="true" />
            ) : (
              <FiPause aria-hidden="true" />
            )}
            {paused ? "Återuppta" : "Pausa uppdateringar"}
          </Button>
        </Inline>
      </header>
      {error && (
        <Inline className={styles.notice} role="status">
          <Text size="sm">{error}</Text>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRetry((value) => value + 1)}
          >
            Försök igen
          </Button>
        </Inline>
      )}
      <MarketStrip overview={data} />
      {data.dataAsOf && (
        <Text size="xs" tone="secondary">
          Kurser per {newsDate(data.dataAsOf)}
          {data.verifiedRealtime ? " · Verifierad realtid" : ""}
        </Text>
      )}
      <div className={styles.marketGrid}>
        <section
          className={cx(styles.section, styles.featured)}
          aria-labelledby="featured-heading"
        >
          <div className={styles.sectionHeader}>
            <Heading id="featured-heading">Viktigast just nu</Heading>
            <Link
              href="/marknaden/nyheter?view=reactions"
              className={styles.textLink}
            >
              Se kursreaktioner <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
          {pendingCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setVisibleItems(pending);
                setPending(null);
              }}
            >
              {pendingCount} nya eller uppdaterade nyheter
            </Button>
          )}
          <div className={styles.news}>
            {featured.length ? (
              featured.map((item) => <NewsFeedItem key={item.id} item={item} />)
            ) : (
              <EmptyState
                title="Inga större nyhetshändelser just nu"
                description="Senaste nytt finns längre ned. Vi fyller inte urvalet med rutinmeddelanden."
              />
            )}
          </div>
        </section>
        <div className={styles.context}>
          <LetterPreview article={edition} />
          <WatchPreview />
        </div>
        <section
          id="senaste-nytt"
          className={cx(styles.section, styles.latest)}
          aria-labelledby="latest-heading"
        >
          <div className={styles.sectionHeader}>
            <Heading id="latest-heading">Senaste nytt</Heading>
            <Link className={styles.textLink} href="/marknaden/nyheter">
              Hela flödet <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
          {isPlusUser ? (
            <LiveNewsFeed compact paused={paused} />
          ) : (
            <>
              <Text size="xs" tone="secondary">
                Senaste i det publika urvalet · hela nyhetsflödet ingår i Plus
              </Text>
              <div className={styles.news}>
                {visibleItems.slice(0, 12).map((item) => (
                  <NewsFeedItem key={item.id} item={item} />
                ))}
              </div>
              {!visibleItems.length && (
                <EmptyState
                  title="Inga nyheter att visa"
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => setRetry((value) => value + 1)}
                    >
                      Försök igen
                    </Button>
                  }
                />
              )}
            </>
          )}
        </section>
      </div>
    </Container>
  );
}
