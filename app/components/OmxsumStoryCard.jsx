import Link from 'next/link';
import { Heading, Text } from './ui/layout';
import { newsDate } from '../utils/newsroom';
import { omxsumStoryHref } from '../utils/omxsumStories';
import styles from './omxsum-stories.module.css';
import { storyTextDateDisplay, storyParagraphDateDisplay } from '../utils/storyDateDisplay';

export default function OmxsumStoryCard({ article }) {
    const href = omxsumStoryHref(article);
    return <article className={styles.card}>
        <div className={styles.cardMeta}>
            <Link href={`/aktie/${encodeURIComponent(article.symbol)}`} className={styles.cardCompany}>{article.companies[0].name}</Link>
            <Text as="time" dateTime={article.publishedAt} size="xs" tone="secondary">{newsDate(article.publishedAt, { month: 'long', year: 'numeric', hour: undefined, minute: undefined })}</Text>
        </div>
        <Heading as="h2" size="subsection" className={styles.cardTitle}><Link href={href}>{storyTextDateDisplay(article.headline)}</Link></Heading>
        <Text size="sm" tone="secondary" className={styles.cardIntro}>{storyParagraphDateDisplay(article.intro)}</Text>
        <Link href={href} className={styles.cardRead} aria-label={`Läs artikeln: ${storyTextDateDisplay(article.headline)}`}>Läs artikeln <span aria-hidden="true">→</span></Link>
    </article>;
}
