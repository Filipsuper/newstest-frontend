"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFeedSearchParams } from "../hooks/useFeedSearchParams";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed, markPersonalNewsRead, setCompanyFollowing } from "../utils/api";
import { personalStoryToItem, preferenceReason } from "../utils/newsroom";
import { onboardingHref } from "../utils/onboarding";
import { personalMatchKinds, reconcileNewsSnapshot } from "../utils/personalNews";
import { useLiveScrollAnchor } from "../hooks/useLiveScrollAnchor";
import { WatchWorkspaceNav } from "./WorkspaceNav";
import WatchPreferencesButton from "./WatchPreferencesButton";
import CompanyAlertStatus from "./CompanyAlertStatus";
import CompanyAlertIntroduction from "./CompanyAlertIntroduction";
import PersonalNewsItem from "./PersonalNewsItem";
import PersonalImportantNews from "./PersonalImportantNews";
import PersonalCompanyQuotes from "./PersonalCompanyQuotes";
import NewsListSkeleton from "./ui/NewsListSkeleton";
import StockSearch from "./StockSearch";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { EmptyState } from "./ui/data";
import styles from "./workspace.module.css";
import dashboard from "./personal-dashboard.module.css";

export default function WatchFeedPage() {
  const { user, isGuestUser, refreshUser, accountError } = useAuthContext();
  const params = useFeedSearchParams();
  const filter = ['all', 'new', 'companies', 'topics', 'keywords'].includes(params.get('filter')) ? params.get('filter') : 'all';
  const [snapshot, setSnapshot] = useState(null);
  const [importantSnapshot, setImportantSnapshot] = useState(null);
  const [importantError, setImportantError] = useState("");
  const importantCache = useRef(null);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [marking, setMarking] = useState(null);
  const markingRequest = useRef(false);
  const [readError, setReadError] = useState('');
  const [paused, setPaused] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState("");
  const olderRequest = useRef(null);
  const rows = useRef([]);
  const loadedKey = useRef(null);
  const loadedPreferences = useRef(null);
  const { listRef, captureAnchor } = useLiveScrollAnchor();
  const preferenceKey = JSON.stringify([user?.email, user?.watchlist, user?.topics, user?.keywords, user?.excludedKeywords]);
  const key = JSON.stringify([preferenceKey, filter]);
  const items = snapshot?.key === key ? snapshot.items : null;
  const important = importantSnapshot?.key === preferenceKey ? importantSnapshot : null;
  const period = snapshot?.key === key && snapshot.sinceHours === 168 ? 'de senaste 7 dagarna' : 'de senaste 48 timmarna';
  const coverage = snapshot?.key === key ? snapshot.coverage : null;
  const nextCursor = snapshot?.key === key ? snapshot.nextCursor : null;
  const readsAvailable = snapshot?.key === key && snapshot.readStateAvailable === true;
  const hasPreferences = Boolean(user?.watchlist?.length || user?.topics?.length || user?.keywords?.length);

  function setFilter(value) {
    const search = new URLSearchParams(window.location.search);
    value === 'all' ? search.delete('filter') : search.set('filter', value);
    window.history.replaceState(null, '', `${window.location.pathname}${search.size ? `?${search}` : ''}`);
  }

  useEffect(() => {
    if (loadedPreferences.current !== preferenceKey) {
      loadedPreferences.current = preferenceKey;
      importantCache.current = null;
      setImportantSnapshot(null);
      setImportantError("");
    }
    if (loadedKey.current !== key) {
      loadedKey.current = key;
      rows.current = [];
      setSnapshot(null);
      setError("");
      setOlderError("");
      setReadError('');
      setLoadingOlder(false);
      setPaused(false);
    }
    if (paused || !user || isGuestUser || !hasPreferences || accountError) return;
    const controller = new AbortController();
    let active = true, refreshing = false;
    const sourceFilter = filter === 'new' ? 'all' : filter;
    const companySource = ['all', 'companies'].includes(sourceFilter);
    function acceptImportant(data, incoming) {
      if (!active) return;
      const separate = Array.isArray(data.importantStories);
      const result = { key: preferenceKey, at: Date.now(),
        items: separate ? data.importantStories.map(personalStoryToItem) : incoming,
        coverage: separate ? data.importantCoverage : data.coverage,
        limited: !separate && Boolean(data.nextCursor) };
      captureAnchor();
      importantCache.current = result;
      setImportantSnapshot(result);
      setImportantError("");
    }
    async function refreshImportant() {
      // The latest feed's topic/keyword filter must not replace the independent
      // company selection. This purposeful source request is only needed when
      // that selection is missing or stale; ordinary all/company loads supply it.
      if (companySource || !user.watchlist?.length || (importantCache.current?.key === preferenceKey
        && Date.now() - importantCache.current.at < 30_000)) return;
      try {
        const data = await fetchPersonalFeed({ limit: 1, filter: 'companies', signal: controller.signal });
        if (!active) return;
        if (!data || data.unavailable || !Array.isArray(data.stories)) throw new Error('Selection unavailable');
        acceptImportant(data, data.stories.map(personalStoryToItem));
      } catch { if (active) setImportantError('Urvalet kunde inte hämtas.'); }
    }
    async function refreshLatest() {
      try {
        const data = await fetchPersonalFeed({ limit: 20, filter: sourceFilter, signal: controller.signal });
        if (!active) return;
        if (!data || data.unavailable || !Array.isArray(data.stories)) throw new Error('Bevakningsflödet kunde inte hämtas. Dina val är fortfarande sparade.');
        const incoming = data.stories.map(story => ({
          ...personalStoryToItem(story), reason: preferenceReason(story), matches: personalMatchKinds(story),
        }));
        captureAnchor();
        rows.current = reconcileNewsSnapshot(rows.current, incoming);
        setSnapshot({ key, items: rows.current, nextCursor: data.nextCursor, coverage: data.coverage,
          readStateAvailable: data.readStateAvailable, sinceHours: data.sinceHours });
        if (companySource) acceptImportant(data, incoming);
        setError("");
      } catch (failure) {
        if (active) {
          captureAnchor(); setError(failure.message);
          if (companySource) setImportantError('Urvalet kunde inte uppdateras.');
        }
      }
    }
    async function refresh() {
      if (!active || refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        await Promise.all([refreshLatest(), refreshImportant()]);
      } finally { refreshing = false; }
    }
    refresh();
    const timer = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [key, hasPreferences, isGuestUser, retry, paused, accountError, captureAnchor]);
  useEffect(() => {
    return () => { olderRequest.current?.abort(); olderRequest.current = null; };
  }, [key]);
  const shown = useMemo(() => (items ?? []).filter(item =>
    filter === 'all' || (filter === 'new' ? readsAvailable && item.readState?.status === 'unread' : item.matches?.includes(filter)),
  ), [items, filter, readsAvailable]);

  async function markRead(item) {
    if (!item.readState?.receipt || markingRequest.current) return;
    const requestKey = key;
    const receipt = item.readState.receipt;
    markingRequest.current = true;
    setMarking(item.id);
    setReadError('');
    try {
      const result = await markPersonalNewsRead([receipt]);
      if (loadedKey.current !== requestKey) return;
      if (!result.acknowledged.includes(receipt)) throw new Error('Lässtatus kunde inte sparas.');
      captureAnchor();
      rows.current = rows.current.map(row => row.readState?.receipt === receipt
        ? { ...row, readState: { ...row.readState, status: 'read' } } : row);
      setSnapshot(previous => previous?.key === requestKey ? { ...previous, items: rows.current } : previous);
      const updateImportant = previous => previous?.key === preferenceKey ? { ...previous,
        items: previous.items.map(row => row.readState?.receipt === receipt
          ? { ...row, readState: { ...row.readState, status: 'read' } } : row) } : previous;
      importantCache.current = updateImportant(importantCache.current);
      setImportantSnapshot(updateImportant);
      setRetry(value => value + 1);
    } catch (failure) { if (loadedKey.current === requestKey) setReadError(failure.message); }
    finally { markingRequest.current = false; setMarking(null); }
  }

  async function loadOlder() {
    if (!nextCursor || olderRequest.current) return;
    const controller = new AbortController();
    olderRequest.current = controller;
    setPaused(true); // Keep this reading snapshot stable until explicitly resumed.
    setLoadingOlder(true);
    setOlderError("");
    try {
      const data = await fetchPersonalFeed({ limit: 20, cursor: nextCursor,
        filter: filter === 'new' ? 'all' : filter,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!data || data.unavailable || !Array.isArray(data.stories)) throw new Error('Äldre matchningar kunde inte hämtas.');
      const incoming = data.stories.map(story => ({ ...personalStoryToItem(story), reason: preferenceReason(story), matches: personalMatchKinds(story) }));
      const existingIds = new Set(incoming.map(item => item.id));
      rows.current = reconcileNewsSnapshot(rows.current, [...rows.current.filter(item => !existingIds.has(item.id)), ...incoming]);
      setSnapshot(previous => ({ ...previous, key, items: rows.current, nextCursor: data.nextCursor,
        readStateAvailable: data.readStateAvailable,
        coverage: previous?.coverage?.complete === false ? previous.coverage : data.coverage }));
    } catch (failure) { if (!controller.signal.aborted) setOlderError(failure.message); }
    finally {
      if (olderRequest.current === controller) { olderRequest.current = null; setLoadingOlder(false); }
    }
  }

  async function follow(company) {
    if (!user || isGuestUser) { setLogin(onboardingHref({ company: company.symbol, returnTo: "/marknaden/bevakning" })); return; }
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
          <Heading as="h1" size="page">Mina bolag</Heading>
          <Text size="sm" tone="secondary">Nyheterna och kursutvecklingen i bolagen du följer.</Text>
        </Stack>
        <Inline className={dashboard.headingActions}>
          <CompanyAlertStatus />
          <WatchPreferencesButton />
        </Inline>
      </header>
      {user && !isGuestUser && <Inline className={dashboard.summary}>
        <Text size="sm" tone="secondary">
          {user.watchlist?.length ?? 0} bolag · {user.topics?.length ?? 0} ämnen · {user.keywords?.length ?? 0} nyckelord
        </Text>
        {Boolean(user.excludedKeywords?.length) && <WatchPreferencesButton initialTab="keywords" variant="ghost" size="sm" icon={null}>
          {user.excludedKeywords.length} undantag
        </WatchPreferencesButton>}
      </Inline>}
      <CompanyAlertIntroduction user={user} />
      {user && !isGuestUser && Boolean(user.watchlist?.length) && <PersonalCompanyQuotes
        watchlist={user.watchlist} accountKey={user.email} paused={paused || Boolean(accountError)} />}
      <section className={styles.section} aria-label="Personliga nyheter">
        {accountError && <EmptyState role="alert" title={user ? "Kontot kunde inte uppdateras. Dina val är fortfarande sparade." : "Kontot kunde inte hämtas."}
          action={<Button variant="secondary" onClick={refreshUser}>Försök hämta kontot igen</Button>} />}
        {!user ? !accountError && <NewsListSkeleton count={3} /> : isGuestUser || !hasPreferences ? (
          <Stack gap={4} className={dashboard.empty}>
            <Heading size="subsection">Börja med ett bolag</Heading>
            <Text size="sm" tone="secondary">Välj ett bolag för att samla dess nyheter här.</Text>
            <StockSearch placeholder="Sök ett bolag att följa" onSelect={follow} showSuggestions />
            {error && <Text size="sm" role="alert">{error}</Text>}
            <Text size="xs" tone="secondary" role="status">{busy ? 'Sparar bevakningen…' : 'Du kan även följa ett bolag direkt från en nyhet.'}</Text>
          </Stack>
        ) : <div className={dashboard.layout}>
          <div className={dashboard.important}>
            {user.watchlist?.length ? <PersonalImportantNews items={important?.items}
              coverage={important?.coverage} limited={important?.limited} watchlist={user.watchlist}
              now={Date.now()} loading={!important && !paused && !importantError && !accountError} paused={paused} error={importantError}
              onRetry={() => { setPaused(false); importantCache.current = null; setRetry(value => value + 1); }}
              onMarkRead={markRead} marking={marking} /> : <Inline className={dashboard.topicsHint}>
              <Text size="sm" tone="secondary">Du följer ämnen och nyckelord. Lägg till ett bolag för en personlig bolagsöverblick.</Text>
              <WatchPreferencesButton initialTab="companies" variant="secondary">Lägg till bolag</WatchPreferencesButton>
            </Inline>}
          </div>
          <Stack as="section" gap={4} className={dashboard.latest} aria-labelledby="personal-latest-title" id="personligt-senaste-nytt">
            <Heading id="personal-latest-title" size="section">Senaste nytt i din bevakning</Heading>
            <SegmentedControl label="Filtrera bevakning" value={filter} onValueChange={setFilter} options={[
            { value: 'all', label: 'Alla' }, { value: 'new', label: 'Olästa' },
            { value: 'companies', label: 'Bolag' }, { value: 'topics', label: 'Ämnen' }, { value: 'keywords', label: 'Nyckelord' },
          ]} />
          <Inline className={dashboard.feedToolbar}>
            <Text size="xs" tone="secondary" role="status">
              {paused ? 'Pausat' : 'Uppdateras automatiskt'} · {coverage?.complete === false ? `Delar av ${period}` : period.replace(/^de senaste/, 'Senaste')}
            </Text>
            <Button variant="ghost" size="sm" disabled={loadingOlder} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
              {paused ? 'Återuppta' : 'Pausa uppdateringar'}
            </Button>
          </Inline>
          {coverage?.complete === false && <Inline>
            <Text size="sm" tone="secondary" role="status">Alla nyheter kunde inte kontrolleras. Det kan finnas fler matchningar.</Text>
            <Button variant="ghost" onClick={() => { setPaused(false); setRetry(value => value + 1); }}>Kontrollera igen</Button>
          </Inline>}
          {nextCursor && <Text size="xs" tone="secondary">Visar hämtade nyheter · fler matchningar finns längre bak i flödet.</Text>}
          {error && <Inline role="alert" className={dashboard.notice}>
            <Text size="sm">{error}</Text>
            <Button variant="ghost" onClick={() => { setPaused(false); setRetry(value => value + 1); }}>Försök igen</Button>
          </Inline>}
          {readError && <Text size="sm" role="alert">{readError}</Text>}
          {!items && !error ? (paused
            ? <Text size="sm" tone="secondary">Uppdateringar pausade.</Text>
            : <NewsListSkeleton count={3} />) : shown.length ? (
            <div className={dashboard.news}>
              {shown.map(item => <div key={item.id} data-live-news-id={item.id}>
                <PersonalNewsItem item={item} reason={item.reason} showSummary={false} onMarkRead={markRead} marking={marking} />
              </div>)}
            </div>
          ) : !error && <EmptyState title={filter === 'new'
            ? readsAvailable ? 'Inga olästa nyheter i det hämtade urvalet' : 'Lässtatus är inte tillgänglig just nu'
            : 'Inga matchningar just nu'}
            description={filter === 'new'
              ? 'Flödet visar hämtade matchningar. Äldre sidor kan innehålla fler olästa nyheter.'
              : coverage?.complete === false ? 'Det hämtade underlaget är ofullständigt. Fler matchningar kan finnas.'
                : 'Dina bevakningar är sparade. Nya matchningar visas automatiskt.'}
            action={filter !== 'all' && <Button variant="secondary" onClick={() => setFilter('all')}>Visa alla matchningar</Button>} />}
          {olderError && <Text size="sm" role="alert">{olderError} Försök igen nedan.</Text>}
          {nextCursor && <Inline><Button variant="secondary" loading={loadingOlder} onClick={loadOlder}>Visa äldre matchningar</Button></Inline>}
          </Stack>
        </div>}
      </section>
      <Dialog open={Boolean(login)} onOpenChange={open => { if (!open) setLogin(null); }} title="Följ dina bolag">
        <LogInModal createAccount redirectTo={login || "/marknaden/bevakning"} />
      </Dialog>
    </Container>
  );
}
