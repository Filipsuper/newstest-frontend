'use client';

import { useEffect, useMemo, useState } from 'react';
import { PriceChart } from './charts/DataCharts';
import { checkedStoryPriceContext, requestStoryPriceContext, storyPricePresentation } from '../utils/storyPriceContext';
import styles from './story-price-context.module.css';

export default function StoryPriceContext({ article, context, access }) {
    const mode = access?.mode || 'none';
    const base = access?.base || process.env.NEXT_PUBLIC_API_URL || '/api';
    const key = `${article.id}:${article.revision}:${article.symbol}`;
    const supplied = useMemo(() => checkedStoryPriceContext(context, article), [context, article]);
    const [loaded, setLoaded] = useState(null);
    useEffect(() => {
        if (context || !['public', 'admin'].includes(mode)) return;
        const controller = new AbortController();
        requestStoryPriceContext(article, { mode, base, origin: window.location.origin, signal: controller.signal })
            .then(value => { if (!controller.signal.aborted) setLoaded({ key, context: value }); });
        return () => controller.abort();
        // The request is bound to identity/version, not article prose or UI state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, context, mode, base]);
    const value = supplied || (loaded?.key === key ? loaded.context : null);
    const presentation = storyPricePresentation(value);
    const pending = !context && ['public', 'admin'].includes(mode) && loaded?.key !== key;
    if (!presentation) return <section className={styles.unavailable} aria-label="Aktiekurs · tre månader">
        <h2>Aktiekurs · 3 månader</h2>
        <p>{pending ? 'Hämtar aktuell kurskontext…' : value?.reason === 'unsupported_market'
            ? 'Tre månaders kursdata finns ännu inte för den här marknaden.'
            : 'Tre månaders kursdata är inte tillgänglig för den här artikeln.'} Artikelns uppgifter påverkas inte.</p>
    </section>;
    return <div className={styles.context} data-story-price-context="current">
        <PriceChart rows={presentation.rows} currency={value.currency} title="Aktiekurs · 3 månader"
            headingAs="h2" seriesLabel="Stängningskurs" hideValues
            description={`Stängningskursen går från ${value.firstClose.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} ${value.currency} till ${presentation.lastClose}. ${presentation.change} kursförändring ${presentation.period}, utan utdelningar.`}
            meta={presentation.meta} note={presentation.note}
            summary={<div className={styles.summary}><span>{presentation.lastClose}</span>
                <span className={styles.change}>{presentation.change} <span>kursförändring</span></span>
                <span className={styles.period}>{presentation.period}</span></div>} />
    </div>;
}
