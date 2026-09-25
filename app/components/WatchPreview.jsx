"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed } from "../utils/api";
import { personalStoryToItem, preferenceReason } from "../utils/newsroom";
import { reconcileNewsSnapshot } from "../utils/personalNews";
import { useLiveScrollAnchor } from "../hooks/useLiveScrollAnchor";
import { Heading, Inline, Text } from "./ui/layout";
import { Button } from "./ui/Button";
import NewsListSkeleton from "./ui/NewsListSkeleton";
import NewsFeedItem from "./NewsFeedItem";
import WatchPreferencesButton from "./WatchPreferencesButton";
import styles from "./workspace.module.css";

export default function WatchPreview({ paused = false }) {
  const { user, isGuestUser } = useAuthContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  const rows = useRef([]);
  const loadedKey = useRef(null);
  const hasSnapshot = useRef(false);
  const { listRef, captureAnchor } = useLiveScrollAnchor();
  const key = JSON.stringify([
    user?.email,
    user?.watchlist,
    user?.topics,
    user?.keywords,
  ]);
  const hasPreferences = Boolean(
    user?.watchlist?.length || user?.topics?.length || user?.keywords?.length,
  );
  useEffect(() => {
    let active = true, busy = false;
    if (loadedKey.current !== key) {
      loadedKey.current = key;
      rows.current = [];
      hasSnapshot.current = false;
      setData(null);
      setError(false);
    }
    if (!user || isGuestUser || !hasPreferences) {
      setLoading(false);
      return;
    }
    if (paused) {
      setLoading(false);
      return;
    }
    async function refresh() {
      if (!active || busy || document.visibilityState === 'hidden') return;
      busy = true;
      if (!hasSnapshot.current) setLoading(true);
      try {
        const result = await fetchPersonalFeed({ limit: 2 });
        if (!active) return;
        if (!result || result.unavailable || !Array.isArray(result.stories)) throw new Error('unavailable');
        captureAnchor();
        rows.current = reconcileNewsSnapshot(rows.current, result.stories.map(story => ({
          ...personalStoryToItem(story), reason: preferenceReason(story),
        })));
        setData({ key, stories: rows.current });
        hasSnapshot.current = true;
        setError(false);
      } catch { if (active) { captureAnchor(); setError(true); } }
      finally { busy = false; if (active) setLoading(false); }
    }
    refresh();
    const timer = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [key, hasPreferences, isGuestUser, retry, paused, captureAnchor]);
  const stories = data?.key === key ? data.stories : [];
  return (
    <section className={styles.section} aria-label="Dina bevakningar" ref={listRef}>
      <Inline className={styles.between}>
        <Heading size="subsection">Dina bevakningar</Heading>
        <Link
          href="/marknaden/bevakning"
          className={styles.textLink}
          aria-label="Öppna dina bevakningar"
        >
          Visa alla
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
      {!user || (loading && !stories.length) ? (
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
          {stories.slice(0, 2).map((story) => (
            <div key={story.id} data-live-news-id={story.id}>
              <NewsFeedItem item={story} reason={story.reason} showSummary={false} compact />
            </div>
          ))}
        </div>
      ) : (
        <Text size="sm" tone="secondary">
          {paused ? 'Uppdateringar pausade.' : 'Inga nya matchningar just nu. Dina bevakningar är sparade.'}
        </Text>
      )}
    </section>
  );
}
