import Link from 'next/link';
import { Heading, Inline, Stack, Text } from './ui/layout';
import { Label } from './ui/Label';
import { newsDate, safeSourceUrl, storyHref } from '../utils/newsroom';
import { OMXSUM_STORY_FORMATS, omxsumStoriesHref } from '../utils/omxsumStories';
import styles from './omxsum-stories.module.css';
import OmxsumStoryChart from './OmxsumStoryChart';
import { validStoryCharts } from '../utils/storiesCharts';
import StoryEstimateCharts from './StoryEstimateCharts';
import StoryPriceContext from './StoryPriceContext';
import { storyDateDisplay, storyTextDateDisplay, storyParagraphDateDisplay } from '../utils/storyDateDisplay';

const articleDate = value => newsDate(value, { month: 'long', year: 'numeric' });

function SourceReferences({ ids, sources, paragraph, onInspectEvidence }) {
    if (onInspectEvidence) return <span className={styles.references}><button className={styles.inspect} onClick={() => onInspectEvidence(paragraph || { sourceIds: ids })} aria-label="Granska underlaget för uppgiften">Underlag ↗</button></span>;
    return <span className={styles.references}>{ids.map(id => {
        const index = sources.findIndex(source => source.id === id);
        return <a key={id} href={`#source-${index + 1}`} aria-label={`Underlag ${index + 1}: ${sources[index]?.title}`}>[{index + 1}]</a>;
    })}</span>;
}

export default function OmxsumStoryReader({ article, onInspectEvidence, estimateContext, onInspectEstimate, priceContext, priceContextAccess }) {
    const narrative = article.schemaVersion === 2;
    const summaryMetrics = article.metrics.filter(metric => !metric.hiddenFromSummary);
    const charts = narrative && validStoryCharts(article) ? article.charts : [];
    return <article className={`${styles.reader} ${narrative ? styles.narrative : ''}`}>
        <Stack gap={6}>
            <header><Stack gap={3}>
                <Inline><Label tone="accent">OMXsum Stories</Label><Text as="span" size="xs" tone="secondary">{OMXSUM_STORY_FORMATS[article.format]}</Text></Inline>
                <Heading as="h1" size="page">{storyTextDateDisplay(article.headline)}</Heading>
                <Text size="xs" tone="secondary">{article.status === 'draft' ? `Opublicerat utkast · underlag ${articleDate(article.asOf)}` : `Publicerad ${articleDate(article.publishedAt)} · Uppdaterad ${articleDate(article.updatedAt)}`}</Text>
                <Text>{storyParagraphDateDisplay(article.intro)}<SourceReferences ids={article.intro.sourceIds} sources={article.sources} paragraph={article.intro} onInspectEvidence={onInspectEvidence} /></Text>
                <Inline>{article.companies.map(company => <Link key={company.symbol} href={`/aktie/${encodeURIComponent(company.symbol)}`}>{company.name}</Link>)}</Inline>
                <Text size="xs" tone="secondary">{article.contentLabel}{!narrative && `. Underlag kontrollerat vid sammanställningen ${newsDate(article.asOf)}. Inte en aktierekommendation.`}</Text>
            </Stack></header>
            <StoryPriceContext article={article} context={priceContext} access={priceContextAccess} />
            {summaryMetrics.length > 0 && <section aria-labelledby="story-figures"><Stack gap={3}>
                <Heading id="story-figures" size="subsection">Siffrorna i korthet</Heading>
                <dl className={styles.metrics}>{summaryMetrics.map(metric => <div key={metric.key}>
                    <dt>{metric.label}</dt><dd>{metric.display}<SourceReferences ids={metric.sourceIds} sources={article.sources} paragraph={metric} onInspectEvidence={onInspectEvidence} />
                        {metric.kind === 'calculation' && <Text as="span" size="xs" tone="secondary"> · OMXsum-beräkning</Text>}
                        {narrative && metric.period?.end && <Text as="span" size="xs" tone="secondary" className={styles.metricNote}>Periodslut {storyDateDisplay(metric.period.end)}</Text>}
                        {narrative && metric.period?.year && <Text as="span" size="xs" tone="secondary" className={styles.metricNote}>{metric.period.basis === 'company_guidance' ? 'Prognosår' : 'År'} {metric.period.year}</Text>}
                        {narrative && metric.conditions?.length > 0 && <Text as="span" size="xs" tone="secondary" className={styles.metricNote}>{metric.conditions.join(' · ')}</Text>}
                    </dd>
                </div>)}</dl>
            </Stack></section>}
            {article.sections.map((section, index) => <section key={`${index}:${section.heading}`}><Stack gap={3}>
                {section.heading && <Heading size="subsection">{storyTextDateDisplay(section.heading)}</Heading>}
                {section.paragraphs.map((paragraph, position) => <div key={position}>
                    {paragraph.kind === 'source_excerpt' && <Text size="xs" tone="secondary">Utdrag ur primärkällan · {article.sources.find(source => source.id === paragraph.sourceIds[0])?.publisher}</Text>}
                    <Text className={paragraph.kind === 'source_excerpt' ? styles.excerpt : undefined}>{storyParagraphDateDisplay(paragraph)}<SourceReferences ids={paragraph.sourceIds} sources={article.sources} paragraph={paragraph} onInspectEvidence={onInspectEvidence} /></Text>
                </div>)}
            </Stack></section>)}
            {charts.map(chart => <OmxsumStoryChart key={chart.id} chart={chart} metrics={article.metrics} asOf={article.asOf} onInspectEvidence={onInspectEvidence} />)}
            {estimateContext && <StoryEstimateCharts article={article} context={estimateContext} onInspectEstimate={onInspectEstimate} />}
            {article.uncertainties.length > 0 && <section className={styles.uncertainties}><Stack gap={3}>
                <Heading size="subsection">Det vet vi inte ännu</Heading>
                <ul>{article.uncertainties.map(text => <li key={text}>{storyTextDateDisplay(text)}</li>)}</ul>
            </Stack></section>}
            {(!narrative || article.timeline.length > 1) && <section aria-labelledby="story-timeline"><Stack gap={3}>
                <Heading id="story-timeline" size="subsection">Händelserna bakom storyn</Heading>
                <Text size="sm" tone="secondary">Originalhändelserna finns kvar i nyhetsflödet. Storyn samlar och förklarar dem.</Text>
                <ol className={styles.timeline}>{article.timeline.map(item => <li key={item.storyId}>
                    <Text size="xs" tone="secondary">{articleDate(item.at)}</Text>
                    <Link href={storyHref(item.storyId, item.title)}>{item.title}</Link>
                </li>)}</ol>
            </Stack></section>}
            <section aria-labelledby="story-sources" className={narrative ? styles.quietSources : undefined}><Stack gap={3}>
                <Heading id="story-sources" size="subsection">Källor & beräkningar</Heading>
                <ol className={styles.sources}>{article.sources.map((source, index) => <li key={source.id} id={`source-${index + 1}`}>
                    {source.url && safeSourceUrl(source.url) ? <a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title} ↗</a> : <Text>{source.title}</Text>}
                    <Text size="xs" tone="secondary">{source.publisher}{source.publishedAt ? ` · ${articleDate(source.publishedAt)}` : ''}{source.periodEnd ? ` · Periodslut ${storyDateDisplay(source.periodEnd)}` : ''}</Text>
                </li>)}</ol>
                <Text size="xs" tone="secondary">{narrative ? 'Rapporterade uppgifter och OMXsum-beräkningar hålls isär. Villkor anges i texten. Detta är inte en aktierekommendation.' : 'Rapporterade uppgifter och OMXsum-beräkningar hålls isär. Kursrörelser används inte som bevis för att en nyhet orsakat en uppgång eller nedgång. Korrigerat eller återkallat underlag kan göra storyn otillgänglig tills den granskats igen.'}</Text>
            </Stack></section>
            <Inline><Link href={omxsumStoriesHref({ symbol: article.symbol })}>Fler stories om {article.companies[0].name}</Link><Link href="/marknaden/nyheter">Till nyhetsflödet →</Link></Inline>
        </Stack>
    </article>;
}
