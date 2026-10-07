import Link from 'next/link';
import { fetchOmxsumStories } from '../../utils/api';
import { omxsumStoriesHref, OMXSUM_STORY_FORMATS, validOmxsumStoryFormat } from '../../utils/omxsumStories';
import { MarketWorkspaceNav } from '../../components/WorkspaceNav';
import OmxsumStoryCard from '../../components/OmxsumStoryCard';
import { Container, Heading, Stack, Text } from '../../components/ui/layout';
import { EmptyState } from '../../components/ui/data';
import styles from '../../components/omxsum-stories.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'OMXsum Stories', description: 'Bolagsnyheter med sammanhang: rapporter, affärer och utvecklingen över tid. Källor, siffror och osäkerheter samlade.', alternates: { canonical: '/marknaden/stories' } };
export default async function Page({ searchParams }) {
    const query = await searchParams;
    const symbol = typeof query?.symbol === 'string' && /^[A-Z0-9.\-]{1,32}$/.test(query.symbol) ? query.symbol : undefined;
    const format = validOmxsumStoryFormat(query?.format) ? query.format : undefined;
    let result, unavailable = false;
    try { result = await fetchOmxsumStories({ symbol, format, cursor: query?.cursor }); }
    catch { unavailable = true; }
    return <Container as="main" className={styles.page}>
        <MarketWorkspaceNav foundation />
        <header className={styles.heading}><Stack gap={3}>
            <Heading as="h1" size="page">OMXsum Stories</Heading>
            <Text tone="secondary">Fördjupning om bolagen och händelserna på börsen.</Text>
            {symbol && <Text size="sm">Artiklar om {symbol} · <Link href={omxsumStoriesHref({ format })}>Visa alla bolag</Link></Text>}
            {format && <Text size="sm">{OMXSUM_STORY_FORMATS[format]} · <Link href={omxsumStoriesHref({ symbol })}>Visa alla artiklar</Link></Text>}
        </Stack></header>
        {unavailable ? <EmptyState title="Artiklarna kunde inte hämtas" action={<Link href={omxsumStoriesHref({ symbol, format })}>Försök igen</Link>} />
            : result.items.length ? <div className={styles.list}>{result.items.map(article => <OmxsumStoryCard key={article.id} article={article} />)}</div>
            : <EmptyState title="Inga publicerade artiklar här ännu" action={<Link href="/marknaden/nyheter">Till nyhetsflödet →</Link>} />}
        {result?.nextCursor && <Link href={omxsumStoriesHref({ symbol, format, cursor: result.nextCursor })}>Äldre artiklar →</Link>}
    </Container>;
}
