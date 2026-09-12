"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed, setCompanyFollowing } from "../utils/api";
import { personalStoryToItem, preferenceReason } from "../utils/newsroom";
import { personalMatchKinds, reconcileNewsSnapshot } from "../utils/personalNews";
import { useLiveScrollAnchor } from "../hooks/useLiveScrollAnchor";
import { WatchWorkspaceNav } from "./WorkspaceNav";
import WatchPreferencesButton from "./WatchPreferencesButton";
import NewsFeedItem from "./NewsFeedItem";
import NewsListSkeleton from "./ui/NewsListSkeleton";
import StockSearch from "./StockSearch";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { EmptyState } from "./ui/data";
import styles from "./workspace.module.css";

export default function WatchFeedPage() {
  const { user, isGuestUser, refreshUser } = useAuthContext();
  const params = useSearchParams();
  const filter = ['all', 'new', 'companies', 'topics', 'keywords'].includes(params.get('filter')) ? params.get('filter') : 'all';
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [lastVisit, setLastVisit] = useState(null);
  const [paused, setPaused] = useState(false);
  const rows = useRef([]);
  const loadedKey = useRef(null);
  const { listRef, captureAnchor } = useLiveScrollAnchor();
  const key = JSON.stringify([user?.email, user?.watchlist, user?.topics, user?.keywords]);
  const items = snapshot?.key === key ? snapshot.items : null;
  const hasPreferences = Boolean(user?.watchlist?.length || user?.topics?.length || user?.keywords?.length);

  function setFilter(value) {
    const search = new URLSearchParams(window.location.search);
    value === 'all' ? search.delete('filter') : search.set('filter', value);
    window.history.replaceState(null, '', `${window.location.pathname}${search.size ? `?${search}` : ''}`);
  }
  useEffect(() => {
    setLastVisit(null);
    if (!user?.email || isGuestUser) return;
    const storageKey = `omxsum:watch-visited:${user.email}`;
    try {
      const last = Number(localStorage.getItem(storageKey));
      setLastVisit(last > 0 && last <= Date.now() ? last : null);
      localStorage.setItem(storageKey, String(Date.now()));
    } catch { /* A local catch-up marker is optional, not a read receipt. */ }
  }, [user?.email, isGuestUser]);

  useEffect(() => {
    if (loadedKey.current !== key) {
      loadedKey.current = key;
      rows.current = [];
      setSnapshot(null);
      setError("");
    }
    if (paused || !user || isGuestUser || !hasPreferences) return;
    let active = true, refreshing = false;
    async function refresh() {
      if (!active || refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        const data = await fetchPersonalFeed({ limit: 50 });
        if (!active) return;
        if (!data || data.unavailable || !Array.isArray(data.stories)) throw new Error('Bevakningsflödet kunde inte hämtas. Dina val är fortfarande sparade.');
        const incoming = data.stories.map(story => ({
          ...personalStoryToItem(story), reason: preferenceReason(story), matches: personalMatchKinds(story),
        }));
        captureAnchor();
        rows.current = reconcileNewsSnapshot(rows.current, incoming);
        setSnapshot({ key, items: rows.current });
        setError("");
      } catch (failure) {
        if (active) { captureAnchor(); setError(failure.message); }
      } finally { refreshing = false; }
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
  const shown = useMemo(() => (items ?? []).filter(item =>
    filter === 'all' || (filter === 'new' ? lastVisit && item.ts > lastVisit : item.matches?.includes(filter)),
  ), [items, filter, lastVisit]);

  async function follow(company) {
    if (!user || isGuestUser) { setLogin(true); return; }
    if (busy || user.watchlist?.includes(company.symbol)) return;
    setBusy(true);
    setError("");
    try {
      await setCompanyFollowing(company.symbol, true);
      await refreshUser();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return (
    <Container as="main" className={styles.workspace} ref={listRef}>
      <WatchWorkspaceNav />
      <header className={styles.heading}>
        <Stack gap={2}>
          <Heading as="h1" size="page">Dina bevakningar</Heading>
          <Text size="sm" tone="secondary">Nyheterna som berör det du följer.</Text>
        </Stack>
        <WatchPreferencesButton />
      </header>
      {user && !isGuestUser && <Inline className={styles.watchSummary}>
        <Text size="sm" tone="secondary">
          {user.watchlist?.length ?? 0} bolag · {user.topics?.length ?? 0} ämnen · {user.keywords?.length ?? 0} nyckelord
        </Text>
      </Inline>}
      <section className={styles.section} aria-label="Personliga nyheter">
        {error && <EmptyState role="alert" title={error}
          action={<Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Försök igen</Button>} />}
        {!user ? <NewsListSkeleton count={3} /> : isGuestUser || !hasPreferences ? (
          <Stack gap={4}>
            <Heading size="subsection">Börja med ett bolag</Heading>
            <Text size="sm" tone="secondary">Välj ett bolag för att samla dess nyheter här.</Text>
            <StockSearch placeholder="Sök ett bolag att följa" onSelect={follow} showSuggestions />
            <Text size="xs" tone="secondary" role="status">{busy ? 'Sparar bevakningen…' : 'Du kan även följa ett bolag direkt från en nyhet.'}</Text>
          </Stack>
        ) : <>
          <SegmentedControl label="Filtrera bevakning" value={filter} onValueChange={setFilter} options={[
            { value: 'all', label: 'Alla' }, ...(lastVisit || filter === 'new' ? [{ value: 'new', label: 'Sedan sist' }] : []),
            { value: 'companies', label: 'Bolag' }, { value: 'topics', label: 'Ämnen' }, { value: 'keywords', label: 'Nyckelord' },
          ]} />
          <Inline className={styles.between}>
            <Text size="xs" tone="secondary" role="status">
              {paused ? 'Pausat' : 'Uppdateras automatiskt'} · Senaste 48 timmarna
              {filter === 'new' && lastVisit && ' · sedan ditt senaste besök på den här enheten'}
            </Text>
            <Button variant="ghost" size="sm" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
              {paused ? 'Återuppta' : 'Pausa uppdateringar'}
            </Button>
          </Inline>
          {!items && !error ? (paused
            ? <Text size="sm" tone="secondary">Uppdateringar pausade.</Text>
            : <NewsListSkeleton count={3} />) : shown.length ? (
            <div className={styles.news}>
              {shown.map(item => <div key={item.id} data-live-news-id={item.id}>
                <NewsFeedItem item={item} reason={item.reason} />
              </div>)}
            </div>
          ) : !error && <EmptyState title={filter === 'new'
            ? lastVisit ? 'Du är ikapp' : 'Inget tidigare besök på den här enheten'
            : 'Inga matchningar just nu'}
            description={filter === 'new' && !lastVisit
              ? 'Visa alla matchningar för att läsa dina nyheter.'
              : 'Dina bevakningar är sparade. Nya matchningar visas automatiskt.'}
            action={filter !== 'all' && <Button variant="secondary" onClick={() => setFilter('all')}>Visa alla matchningar</Button>} />}
        </>}
      </section>
      <Dialog open={login} onOpenChange={setLogin} title="Spara din bevakning">
        <LogInModal redirectTo="/marknaden/bevakning" />
      </Dialog>
    </Container>
  );
}
