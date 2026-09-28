"use client";
import { useId, useState } from 'react';
import Link from 'next/link';
import { followedCompanies, groupPersonalCompanies, importantPersonalNews, personalEvents } from '../utils/personalOverview';
import PersonalNewsItem from './PersonalNewsItem';
import { Button } from './ui/Button';
import { Heading, Inline, Stack, Text } from './ui/layout';
import styles from './workspace.module.css';

function CompanyNews({ company, onMarkRead, marking }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <section className={styles.section} aria-label={company.name || company.symbol}>
    <Inline className={styles.between}>
      <Link className={styles.textLink} href={`/aktie/${encodeURIComponent(company.symbol)}`}>{company.name || company.symbol}</Link>
      {company.items.length > 1 && <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
        {expanded ? 'Visa färre' : `Visa ${company.items.length - 1} till`}
      </Button>}
    </Inline>
    <div id={id} className={styles.news}>
      {(expanded ? company.items : company.items.slice(0, 1)).map(item => <div key={item.id} data-live-news-id={`${company.symbol}:${item.id}`}>
        <PersonalNewsItem item={item} showSummary={false} onMarkRead={onMarkRead} marking={marking} />
      </div>)}
    </div>
  </section>;
}

export default function PersonalCompanyOverview({ items, importantItems, importantCoverage, watchlist = [], now, onMarkRead, marking }) {
  const important = importantPersonalNews(importantItems ?? items, watchlist, now);
  const groups = groupPersonalCompanies(items, watchlist);
  const other = personalEvents(items).filter(item => !followedCompanies(item, watchlist).length);
  return <Stack gap={8}>
    <section className={styles.section} aria-label="Viktigt i dina bolag">
      <Heading size="subsection">Viktigt i dina bolag</Heading>
      {(importantCoverage?.complete === false || importantCoverage?.candidatesLimited) && <Text size="xs" tone="secondary">
        {importantCoverage.complete === false ? 'Urvalet är ofullständigt. Fler viktiga bolagsnyheter kan finnas.' : 'Urval bland de 20 högst prioriterade bolagsnyheterna.'}
      </Text>}
      {important.length ? important.map(item => <div key={item.id} data-live-news-id={`important:${item.id}`}>
        <PersonalNewsItem item={item} showSummary onMarkRead={onMarkRead} marking={marking} />
      </div>) : <Text size="sm" tone="secondary">{(importantItems ?? items).some(item => item.readState?.status === 'read') ? 'Inga olästa större händelser i de hämtade nyheterna.' : 'Inga större händelser i de hämtade nyheterna.'} Bolagens senaste uppdateringar finns nedan.</Text>}
    </section>
    {groups.length > 0 && <section className={styles.section} aria-label="Bolag för bolag">
      <Heading size="subsection">Bolag för bolag</Heading>
      <Stack gap={6}>{groups.map(company => <CompanyNews key={company.symbol} company={company} onMarkRead={onMarkRead} marking={marking} />)}</Stack>
    </section>}
    {other.length > 0 && <section className={styles.section} aria-label="Dina andra bevakningar">
      <Heading size="subsection">Dina andra bevakningar</Heading>
      <Text size="sm" tone="secondary">Ämnen och nyckelord utanför bolagen du följer.</Text>
      <div className={styles.news}>{other.map(item => <div key={item.id} data-live-news-id={item.id}>
        <PersonalNewsItem item={item} reason={item.reason} showSummary={false} onMarkRead={onMarkRead} marking={marking} />
      </div>)}</div>
    </section>}
  </Stack>;
}
