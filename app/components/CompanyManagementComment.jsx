"use client";

import { FiExternalLink, FiCompass, FiActivity } from 'react-icons/fi';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Heading, Inline, Stack, Text } from './ui/layout';
import { managementAvailability, managementSource } from '../utils/companyResearch';
import styles from './company-research.module.css';

const dateLabel = value => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Stockholm' }) : null;
const lines = values => Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.trim()) : [];

export default function CompanyManagementComment({ comment, latestReport }) {
  const source = managementSource(comment, latestReport);
  const summary = comment?.summary;
  const isComment = comment?.type === 'ceo_comment';
  const paragraphs = String(comment?.text ?? '').trim().split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  const outlook = lines(summary?.outlook), changes = lines(summary?.changesAndRisks);
  const summaryText = typeof summary?.summary === 'string' ? summary.summary.trim() : '';
  const hasSummary = Boolean(summaryText || outlook.length || changes.length);
  const period = comment ? comment.fiscalPeriod ?? comment.periodLabel : latestReport?.fiscalPeriod;
  const publicationDate = comment ? comment.publishedAt : latestReport?.publishedAt;
  const published = dateLabel(publicationDate);
  const earlier = comment?.selection === 'latest_available' || (comment?.fiscalPeriod && latestReport?.fiscalPeriod && comment.fiscalPeriod !== latestReport.fiscalPeriod);
  return <Stack gap={6} className={styles.management}>
    <Inline className={styles.between}>
      <Inline gap={2}><Label>{isComment ? 'VD-kommentar' : 'VD-ord'}</Label>{period && <Text size="sm">{period}</Text>}</Inline>
      {published && <Text as="time" size="xs" tone="secondary" dateTime={publicationDate}>{published}</Text>}
    </Inline>
    {earlier && <Text size="sm" tone="secondary">Senaste tillgängliga VD-ord{period ? ` · ${period}` : ''}{latestReport?.fiscalPeriod && latestReport.fiscalPeriod !== period ? `. VD-ord för ${latestReport.fiscalPeriod} är inte tillgängligt här ännu.` : '.'}</Text>}
    {!comment ? <Text size="sm" tone="secondary">{managementAvailability(latestReport)}</Text> : hasSummary ? <>
      <Stack gap={3} className={styles.reading}>
        <Label>AI-sammanfattning</Label>
        {summaryText && <Text>{summaryText}</Text>}
      </Stack>
      {(outlook.length > 0 || changes.length > 0) && <div className={styles.commentColumns}>
        {[["Utsikter", outlook], ["Förändringar och risker", changes]].filter(([, entries]) => entries.length).map(([title, entries]) =>
          <Stack gap={3} key={title}>
            <Heading as="h3" size="subsection" className={styles.commentHeading}>{title === 'Utsikter' ? <FiCompass aria-hidden="true" /> : <FiActivity aria-hidden="true" />}{title}</Heading>
            <ul className={styles.commentList}>{entries.map((entry, index) => <li key={index}><span className={styles.commentNumber} aria-hidden="true">{index + 1}</span><Text>{entry}</Text></li>)}</ul>
          </Stack>)}
      </div>}
    </> : paragraphs.length ? <Text size="sm" tone="secondary">AI-sammanfattning saknas. Läs ledningens egna ord nedan.</Text> : <Text size="sm" tone="secondary">Originaltexten är inte tillgänglig här.</Text>}
    {paragraphs.length > 0 && <details className={styles.original} open={!hasSummary ? true : undefined}>
      <summary>Läs hela {isComment ? 'VD-kommentaren' : 'VD-ordet'}</summary>
      <Stack gap={4} className={styles.reading}>
        <Label>Originaltext</Label>
        {paragraphs.map((paragraph, index) => <Text key={index}>{paragraph}</Text>)}
      </Stack>
    </details>}
    <Inline className={styles.between}>
      {source ? <Button variant="secondary" nativeButton={false} role="link" render={<a href={source} target="_blank" rel="noreferrer" />}>
        Öppna originalkällan <FiExternalLink aria-hidden="true" />
      </Button> : comment && <Text size="xs" tone="secondary">Källänk saknas.</Text>}
      {Number.isInteger(comment?.pageStart) && <Text size="xs" tone="secondary">PDF-sida {comment.pageStart}{comment.pageEnd > comment.pageStart ? `–${comment.pageEnd}` : ''}</Text>}
    </Inline>
  </Stack>;
}
