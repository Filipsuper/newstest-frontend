"use client";

import { FiLock } from 'react-icons/fi';
import { publicNewsPreview } from '../utils/publicNewsPreview';
import { usePublicMarketOverview } from './usePublicMarketOverview';
import NewsFeedItem from './NewsFeedItem';
import UpgradeLink from './UpgradeLink';
import { Button } from './ui/Button';
import { EmptyState } from './ui/data';
import { Label } from './ui/Label';
import { Inline, Stack, Text } from './ui/layout';
import NewsListSkeleton from './ui/NewsListSkeleton';
import styles from './public-news-feed.module.css';

export default function PublicNewsFeed() {
  const { data, error, loading, retry } = usePublicMarketOverview();
  const items = data ? publicNewsPreview(data) : [];
  return <section className={styles.feed} aria-label="Publikt nyhetsurval">
    <div className={styles.intro}>
      <Stack gap={2}>
        <Label>Publikt nyhetsurval</Label>
        <Text size="sm" tone="secondary">Ett öppet utdrag ur det vanliga nyhetsflödet, med senast publicerat först.</Text>
      </Stack>
      <Inline gap={2} className={styles.offer}>
        <Text size="xs" tone="secondary" className={styles.locked}><FiLock aria-hidden="true" /> Sökning, filter och hela historiken ingår i Plus.</Text>
        <UpgradeLink tier="plus" fallback="Utforska Plus" variant="ghost" size="sm" />
      </Inline>
    </div>
    {error && <EmptyState role="alert" title={error}
      description={data ? 'Det tidigare hämtade urvalet visas nedan.' : 'Försök igen för att läsa det publika urvalet.'}
      action={<Button variant="secondary" onClick={retry} disabled={loading}>Försök igen</Button>} />}
    {data?.stale && <Text size="xs" tone="secondary" role="status">Urvalet är tillfälligt fördröjt. Senast tillgängliga nyheter visas.</Text>}
    {!data && loading ? <NewsListSkeleton />
      : data && items.length ? <div className={styles.rows}>
        {items.map(item => <NewsFeedItem key={item.id} item={item} showSummary={false} />)}
      </div>
      : data && <EmptyState title="Inga nyheter i det publika urvalet just nu"
        description="Ett tomt urval betyder inte att hela nyhetsflödet är tomt."
        action={<Button variant="secondary" onClick={retry} disabled={loading}>Uppdatera urvalet</Button>} />}
    {items.length > 0 && <Inline className={styles.footer}>
      <Text size="xs" tone="secondary">Visar {items.length} {items.length === 1 ? 'nyhet' : 'nyheter'} ur det öppna marknadsurvalet.</Text>
      <Button variant="ghost" size="sm" onClick={retry} disabled={loading}>{loading ? 'Hämtar urvalet…' : 'Uppdatera urvalet'}</Button>
    </Inline>}
  </section>;
}
