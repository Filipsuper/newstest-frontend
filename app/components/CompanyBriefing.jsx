"use client";

import { useId } from 'react';
import { FiArrowUpRight, FiBookOpen } from 'react-icons/fi';
import { Button } from './ui/Button';
import { Dialog } from './ui/overlays';
import { Heading, Inline, Stack, Text } from './ui/layout';
import { prototypeBriefingPrice, qualifiedCompanyBriefing } from '../utils/companyBriefing';
import styles from './company-briefing.module.css';

const dateLabel = (value, year = false) => new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'Europe/Stockholm',
}).format(new Date(value));

export default function CompanyBriefing({ briefing, symbol, companyName, priceContext, allowPrototype = false }) {
  const headingId = useId();
  const record = qualifiedCompanyBriefing(briefing, symbol, { allowPrototype });
  if (!record) return null;
  const prototype = record.mode === 'reviewed_prototype';
  const price = prototype ? prototypeBriefingPrice(record, symbol) : priceContext;
  const priceLabel = value => `${value.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} ${price.currency === 'SEK' ? 'kr' : price.currency}`;
  const sourcesFor = claim => record.sources.filter(source => claim.sourceIds.includes(source.id));
  return <aside aria-labelledby={headingId} className={`${styles.briefing} ${styles.highlighted}`}>
    <Stack gap={3}>
      <Heading as="h2" size="subsection" id={headingId}>{record.headline}</Heading>
      <Text>{record.summary.text}{price ? ` ${price.sentence}` : ''}</Text>
    </Stack>
    <Inline className={styles.footer}>
      <Text as="span" size="xs" tone="secondary">{prototype ? 'AI-utkast' : 'AI-sammanfattning'} · {dateLabel(record.asOf, true)}</Text>
      <Dialog title="Bakom lägesbilden" className={styles.sourceDialog} description={`Källor och daterad bakgrund för ${companyName || symbol}. ${prototype ? 'Prototypen är ett granskat AI-utkast, inte en automatiskt uppdaterad analys.' : 'Sammanfattningen är AI-genererad utifrån bolagets nyheter och tillgängliga rapportkommentarer.'}`}
        trigger={<Button variant="ghost"><FiBookOpen aria-hidden="true" /> Källor & bakgrund</Button>}>
        <Stack gap={6}>
          {[{ id: 'main', title: record.headline, ...record.summary }, ...(record.background ?? [])].map(claim => <Stack gap={2} key={claim.id}>
            <Heading as="h3" size="subsection">{claim.title}</Heading>
            <Text>{claim.text}</Text>
            <ul className={styles.sources}>{sourcesFor(claim).map(source => <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer"><span>{source.title}<small>{source.publishedAt ? dateLabel(source.publishedAt, true) : `Avläst ${dateLabel(source.observedAt, true)}`}{source.detail ? ` · ${source.detail}` : ''}</small></span><FiArrowUpRight aria-hidden="true" /></a>
            </li>)}</ul>
          </Stack>)}
          {price && <Stack gap={2}>
            <Heading as="h3" size="subsection">Kurs i sammanfattningen</Heading>
            <Text>{price.sentence}</Text>
            <Text size="sm" tone="secondary">Beräknad från stängningskursen {priceLabel(price.baselinePrice)} den {dateLabel(price.baselineDate, true)} till {priceLabel(price.price)}. Kurskälla: {price.source}. Daterad kursbild, inte ett löfte om realtid. Kurssatsen skapas från kursdata och inte av AI-modellen.</Text>
          </Stack>}
          <Text size="sm" tone="secondary">{price ? 'Dagsförändringen mäts från föregående stängning, inte från nyhetens publicering.' : 'Kursen visas separat från texten.'} En kursrörelse efter en nyhet visar ett tidsmässigt samband, inte hur stor del av rörelsen nyheten orsakade. Makronyheter har inte lagts till utan en belagd koppling.</Text>
        </Stack>
      </Dialog>
    </Inline>
  </aside>;
}
