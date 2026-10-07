'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchOmxsumStories } from '../utils/api';
import { omxsumStoryHref, omxsumStoriesHref } from '../utils/omxsumStories';
import { Heading, Stack, Text } from './ui/layout';

export default function OmxsumStoriesRelated({ newsId, symbol }) {
    const [items, setItems] = useState([]);
    useEffect(() => {
        const controller = new AbortController();
        setItems([]);
        fetchOmxsumStories({ newsId, symbol, signal: controller.signal })
            .then(result => { if (!controller.signal.aborted) setItems(result.items.slice(0, 3)); })
            .catch(() => {});
        return () => controller.abort();
    }, [newsId, symbol]);
    if (!items.length) return null;
    return <Stack as="section" gap={3} aria-label="OMXsum Stories">
        <Heading size="subsection">OMXsum Stories</Heading>
        <Text size="sm" tone="secondary">Sammanhanget bakom händelserna.</Text>
        {items.map(article => <Link key={article.id} href={omxsumStoryHref(article)}>{article.headline}</Link>)}
        {symbol && <Link href={omxsumStoriesHref({ symbol })}>Alla stories om bolaget →</Link>}
    </Stack>;
}
