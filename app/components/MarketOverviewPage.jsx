"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowDown, FiArrowRight, FiPause, FiPlay } from "react-icons/fi";
import { fetchAllArticles, fetchMarketOverview } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import { isSwedishNews } from "../utils/swedishNews";
import {
  changedFeedItems,
  chronologicalNews,
  featuredNews,
  finiteNumber,
  newsDate,
} from "../utils/newsroom";
import { reconcileNewsSnapshot } from "../utils/personalNews";
import { useLiveScrollAnchor } from "../hooks/useLiveScrollAnchor";
import { currentLetter, marketDateKey } from "../utils/letters";
import { MarketWorkspaceNav } from "./WorkspaceNav";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/data";
import MarketQuote from "./MarketQuote";
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
      .filter((story) => story?.headline && story?.id && isSwedishNews(story))
      .map(storyToItem),
  );

function MarketStrip({ overview }) {
  const oil = overview.commodities?.find(item => item.id === "brent");
  const oilPrice = finiteNumber(oil?.price);
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
        return <MarketQuote key={id} name={name} subtitle={session || "Kursdata saknas"}
          change={change} points={index?.session?.points} period={session || "senaste session"} />;
      })}
      <MarketQuote name="Brentolja" subtitle={oilPrice !== null
        ? `${oilPrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/fat`
        : "Kursdata saknas"}
        change={finiteNumber(oil?.changePct)} points={oil?.session?.points}
        chartLabel={`senaste handelspass${oil?.session?.asOf ? ` · ${newsDate(oil.session.asOf)}` : ""}`}
        period={`mot föregående stängning${oil?.asOf ? ` · ${newsDate(oil.asOf)}` : ""}`}
        details={`Brenttermin · Yahoo Finance${oil?.asOf ? ` · ${newsDate(oil.asOf)}` : ""}${oil?.refreshFailed ? " · Uppdatering fördröjd" : ""}`} />
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
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(
    overview.unavailable ? "Marknadsläget kunde inte hämtas." : "",
  );
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() =>
    new Date(referenceTime || overview.generatedAt || 0).getTime(),
  );
  const [visibleItems, setVisibleItems] = useState(() => itemsFrom(overview));
  const currentItems = useRef(visibleItems);
  const [selectionItems, setSelectionItems] = useState(visibleItems);
  const [selectionTime, setSelectionTime] = useState(now);
  const { listRef, captureAnchor } = useLiveScrollAnchor();
  useEffect(() => {
    if (paused) return;
    let active = true,
      busy = false,
      count = 0;
    async function refresh() {
      if (!active || busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const next = await fetchMarketOverview({
          signal: AbortSignal.timeout(15_000),
        });
        if (!active) return;
        captureAnchor();
        setData(next);
        setNow(Date.now());
        setError(
          next.stale
            ? "Tillfälligt fördröjda data. Senaste tillgängliga uppgifter visas."
            : "",
        );
        const incoming = reconcileNewsSnapshot(currentItems.current, itemsFrom(next));
        const contentChanged = changedFeedItems(currentItems.current, incoming, { showSummary: false }).length > 0
          || currentItems.current.map(item => item.id).join() !== incoming.map(item => item.id).join();
        currentItems.current = incoming;
        setVisibleItems(incoming);
        if (contentChanged) {
          setSelectionItems(incoming);
          setSelectionTime(Date.now());
        }
        if (count++ % 4 === 0) {
          const letters = await fetchAllArticles({
            signal: AbortSignal.timeout(15_000),
          });
          if (active && Array.isArray(letters)) { captureAnchor(); setEditions(letters); }
        }
      } catch {
        if (active) {
          captureAnchor();
          setError(
            "Uppdateringen misslyckades. Senaste tillgängliga uppgifter visas.",
          );
        }
      } finally {
        busy = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [paused, retry, captureAnchor]);
  const featured = useMemo(
    () => featuredNews(selectionItems, selectionTime),
    [selectionItems, selectionTime],
  );
  const edition = currentLetter(editions, now);
  const observedById = new Map(visibleItems.map(item => [item.id, item]));
  const latest = visibleItems[0];
  return (
    <Container as="main" className={styles.workspace} ref={listRef}>
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
          <div className={styles.news}>
            {featured.length ? (
              featured.map((item) => <div key={item.id} data-live-news-id={`featured:${item.id}`}>
                <NewsFeedItem item={observedById.get(item.id) ?? item} showSummary={false} />
              </div>)
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
          <WatchPreview paused={paused} />
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
            <LiveNewsFeed compact market="se" paused={paused} />
          ) : (
            <>
              <Text size="xs" tone="secondary">
                Senaste i det publika urvalet · hela nyhetsflödet ingår i Plus
              </Text>
              <div className={styles.news}>
                {visibleItems.slice(0, 12).map((item) => (
                  <div key={item.id} data-live-news-id={`latest:${item.id}`}>
                    <NewsFeedItem item={item} />
                  </div>
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
