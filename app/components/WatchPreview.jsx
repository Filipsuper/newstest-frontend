"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed, fetchPersonalPreviewObservations } from "../utils/api";
import { personalStoryToItem, preferenceReason } from "../utils/newsroom";
import { reconcileNewsSnapshot } from "../utils/personalNews";
import { personalFeedCache, personalFeedScope } from '../utils/personalFeedCache';
import { followedCompanies } from "../utils/personalOverview";
import { PERSONAL_PREVIEW_QUERY, PERSONAL_OBSERVATION_FIELDS } from '../utils/personalPreview';
import { useLiveScrollAnchor } from "../hooks/useLiveScrollAnchor";
import { Heading, Inline, Text } from "./ui/layout";
import { Button } from "./ui/Button";
import NewsListSkeleton from "./ui/NewsListSkeleton";
import NewsFeedItem from "./NewsFeedItem";
import WatchPreferencesButton from "./WatchPreferencesButton";
import styles from "./workspace.module.css";

const query = PERSONAL_PREVIEW_QUERY;
function previewData(result, key, previous = []) {
  return { key, stories: reconcileNewsSnapshot(previous, result.stories.slice(0, 2).map(story => {
    const item = { ...personalStoryToItem(story), reason: preferenceReason(story) };
    for (const field of PERSONAL_OBSERVATION_FIELDS) if (!(field in story)) item[field] = undefined;
    return item;
  })), coverage: result.coverage, nextCursor: result.nextCursor };
}

export default function WatchPreview({ paused = false }) {
  const { user, isGuestUser } = useAuthContext();
  useSyncExternalStore(personalFeedCache.subscribe, personalFeedCache.getRevision, () => 0);
  const key = personalFeedScope(user);
  const cached = personalFeedCache.get(user, query)?.data;
  const [data, setData] = useState(() => cached ? previewData(cached, key) : null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  const rows = useRef([]);
  const loadedKey = useRef(null);
  const retryCount = useRef(0);
  const { listRef, captureAnchor } = useLiveScrollAnchor();
  const hasPreferences = Boolean(user?.watchlist?.length);
  useEffect(() => {
    let active = true, busy = false, snapshot;
    const controller = new AbortController();
    if (loadedKey.current !== key) {
      loadedKey.current = key;
      const initial = cached ? previewData(cached, key) : null;
      rows.current = initial?.stories ?? [];
      setData(initial);
      setError(false);
    }
    if (!user || isGuestUser || !hasPreferences) {
      return;
    }
    if (paused) {
      setData(previous => previous?.key === key ? previous : cached ? previewData(cached, key)
        : { key, stories: [], coverage: undefined });
      return;
    }
    async function enrich(result) {
      try {
        const enriched = await fetchPersonalPreviewObservations({ user, ...query, snapshot: result, signal: controller.signal });
        if (!active || snapshot !== result || !enriched) return;
        captureAnchor();
        const next = previewData(enriched, key, rows.current);
        rows.current = next.stories;
        setData(next);
      } catch { /* Optional observations never hide available headlines. */ }
    }
    async function refresh(revalidate = false) {
      if (!active || busy || document.visibilityState === 'hidden') return;
      busy = true;
      const force = revalidate || retryCount.current !== retry;
      retryCount.current = retry;
      try {
        const result = await fetchPersonalFeed({ user, ...query, force, signal: controller.signal });
        if (!active) return;
        if (!result || result.unavailable || !Array.isArray(result.stories)) throw new Error('unavailable');
        captureAnchor();
        const next = previewData(result, key, rows.current);
        rows.current = next.stories;
        snapshot = result;
        setData(next);
        setError(false);
        // Paint the headlines now; this separate request must not block them.
        void enrich(result);
      } catch { if (active) { captureAnchor(); setError(true); } }
      finally { busy = false; }
    }
    refresh();
    const timer = setInterval(() => refresh(true), 30_000);
    const visible = () => refresh();
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [key, hasPreferences, isGuestUser, retry, paused, captureAnchor]);
  const visibleData = data?.key === key ? data : cached ? previewData(cached, key) : null;
  const stories = visibleData ? visibleData.stories.filter(item => followedCompanies(item, user?.watchlist ?? []).length) : [];
  const selected = stories.slice(0, 2);
  // The overview's first job is market news, not a large empty account panel.
  // Keep a single clear route into personalisation before the first follow.
  if (user && (isGuestUser || !hasPreferences)) return <section className={styles.section} aria-label="Dina bevakningar">
    <Inline className={styles.between}>
      <Text size="sm">Nyheter om dina bolag, samlade här.</Text>
      <Link className={styles.textLink} href="/marknaden/bevakning">Följ ditt första bolag <FiArrowRight aria-hidden="true" /></Link>
    </Inline>
  </section>;
  return (
    <section className={styles.section} aria-label="Dina bevakningar" ref={listRef}>
      <Inline className={styles.between}>
        <Heading size="subsection">Mina bolag</Heading>
        <Link
          href="/marknaden/bevakning"
          className={styles.textLink}
          aria-label="Öppna dina bevakningar"
        >
          Öppna mina bolag
          <FiArrowRight aria-hidden="true" />
        </Link>
      </Inline>
      {user && !isGuestUser && <Inline className={styles.between}>
        <Text size="xs" tone="secondary">{user.watchlist?.length ?? 0} bolag · {user.topics?.length ?? 0} ämnen · {user.keywords?.length ?? 0} nyckelord</Text>
        <WatchPreferencesButton variant="ghost" size="sm">Anpassa</WatchPreferencesButton>
      </Inline>}
      {error && stories.length > 0 && <Inline>
        <Text size="xs" tone="secondary" role="status">Kunde inte uppdatera. Visar senast hämtade nyheter.</Text>
        <Button variant="ghost" size="sm" onClick={() => setRetry((value) => value + 1)}>Försök igen</Button>
      </Inline>}
      {visibleData?.coverage?.complete === false && visibleData.coverage.reason !== 'preview_limit' && <Text size="xs" tone="secondary" role="status">Alla nyheter kunde inte kontrolleras. Öppna Mina bolag för att försöka igen.</Text>}
      {!user || (!visibleData && !error && !isGuestUser && hasPreferences && !paused) ? (
        <NewsListSkeleton count={2} compact label="Hämtar dina bevakningar" />
      ) : isGuestUser || !hasPreferences ? (
        <>
          <Text size="sm" tone="secondary">
            Följ ett bolag från en nyhet. Nästa uppdatering samlas här.
          </Text>
          <Link className={styles.textLink} href="/marknaden/bevakning">
            Lägg till ditt första bolag <FiArrowRight aria-hidden="true" />
          </Link>
        </>
      ) : error && !stories.length ? (
        <>
          <Text size="sm" role="status">
            Bevakningen kunde inte hämtas.
          </Text>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            Försök igen
          </Button>
        </>
      ) : stories.length ? (
        <div className={styles.watchRows}>
          <Text size="xs" tone="secondary">Senaste i dina bolag</Text>
          {selected.map((story) => (
            <div key={story.id} data-live-news-id={story.id}>
              <NewsFeedItem item={story} reason={story.reason} showSummary={false} compact variant="brief" />
            </div>
          ))}
        </div>
      ) : (
        <Text size="sm" tone="secondary">
          {paused ? 'Uppdateringar pausade.' : visibleData?.coverage?.complete === true ? 'Inga bolagsnyheter i den hämtade perioden.' : 'Inga bolagsnyheter i det hämtade underlaget. Öppna Mina bolag för fler bevakningar.'}
        </Text>
      )}
    </section>
  );
}
