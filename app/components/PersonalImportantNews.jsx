"use client";

import { importantPersonalNews } from '../utils/personalOverview';
import PersonalNewsItem from './PersonalNewsItem';
import NewsListSkeleton from './ui/NewsListSkeleton';
import { Button } from './ui/Button';
import { EmptyState } from './ui/data';
import { Heading, Inline, Stack, Text } from './ui/layout';
import styles from './personal-dashboard.module.css';

/** The server's separate company selection never becomes a chronological page. */
export default function PersonalImportantNews({ items, coverage, watchlist = [], loading, error,
  limited = false, paused = false, now, onRetry, onMarkRead, marking }) {
  const important = importantPersonalNews(items ?? [], watchlist, now);
  return <Stack as="section" gap={4} aria-labelledby="personal-important-title" className={styles.section}>
    <Heading id="personal-important-title" size="section">Viktigast för dig</Heading>
    {error && <Inline className={styles.notice} role="status">
      <Text size="sm">{items ? 'Urvalet kunde inte uppdateras. Senaste hämtade nyheter visas.' : 'Viktiga bolagsnyheter kunde inte hämtas.'}</Text>
      <Button variant="ghost" size="sm" onClick={onRetry}>Försök igen</Button>
    </Inline>}
    {(coverage?.complete === false || coverage?.candidatesLimited || limited) && <Text size="xs" tone="secondary">
      {coverage?.complete === false ? 'Urvalet är ofullständigt. Fler viktiga bolagsnyheter kan finnas.'
        : coverage?.candidatesLimited ? 'Urval bland de 20 högst prioriterade bolagsnyheterna.'
        : 'Urval bland hämtade bolagsnyheter. Äldre matchningar kan innehålla fler.'}
    </Text>}
    {loading && !items && !error ? <NewsListSkeleton count={2} /> : paused && !items && !error ? <Text size="sm" tone="secondary">Uppdateringar pausade.</Text> : important.length ? <div className={styles.news}>
      {important.map(item => <div key={item.id} data-live-news-id={`important:${item.id}`}>
        <PersonalNewsItem item={item} showSummary onMarkRead={onMarkRead} marking={marking} />
      </div>)}
    </div> : !error && items && <EmptyState
      title={items.some(item => item.readState?.status === 'read') ? 'Inga olästa större händelser i de hämtade nyheterna' : 'Inga större händelser i de hämtade nyheterna'}
      description="Bolagens senaste uppdateringar finns i flödet nedan." />}
  </Stack>;
}
