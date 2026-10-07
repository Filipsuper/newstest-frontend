import Link from 'next/link';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { fetchOmxsumStory } from '../../utils/api';
import { omxsumStoryId, omxsumStoryHref } from '../../utils/omxsumStories';
import OmxsumStoryReader from '../../components/OmxsumStoryReader';
import { Container, Stack, Heading, Text } from '../../components/ui/layout';
import styles from '../../components/omxsum-stories.module.css';

export const dynamic = 'force-dynamic';
const load = cache(async segment => {
    const id = omxsumStoryId(segment);
    if (!id) return { notFound: true };
    try { return { article: await fetchOmxsumStory(id) }; }
    catch (error) { return error.status === 404 ? { notFound: true } : { unavailable: true }; }
});
export async function generateMetadata({ params }) {
    const result = await load((await params).id);
    if (!result.article) return { title: 'Storyn är inte tillgänglig', robots: { index: false, follow: true } };
    const article = result.article, url = `https://omxsum.com${omxsumStoryHref(article)}`;
    return { title: article.headline, description: article.intro.text.slice(0, 240), alternates: { canonical: url },
        openGraph: { type: 'article', title: article.headline, description: article.intro.text.slice(0, 240), url, publishedTime: article.publishedAt, modifiedTime: article.updatedAt, siteName: 'OMXsum' } };
}
export default async function Page({ params }) {
    const { id } = await params;
    const result = await load(id);
    if (result.notFound) notFound();
    if (result.article && omxsumStoryHref(result.article) !== `/story/${id}`) permanentRedirect(omxsumStoryHref(result.article));
    return <Container as="main" reading className={styles.page}><Stack gap={6}>
        <Link href="/marknaden/stories">← OMXsum Stories</Link>
        {result.article ? <OmxsumStoryReader article={result.article} estimateContext={result.article.estimateContext} priceContextAccess={{ mode: 'public' }} /> : <Stack>
            <Heading as="h1">Storyn är tillfälligt otillgänglig</Heading><Text>Försök igen eller läs händelserna i nyhetsflödet.</Text>
            <Link href={`/story/${id}`}>Försök igen</Link><Link href="/marknaden/nyheter">Nyhetsflödet</Link>
        </Stack>}
    </Stack></Container>;
}
