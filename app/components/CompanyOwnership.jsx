"use client";

import { useState } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { fetchInsiders } from '../utils/api';
import { finite } from '../utils/companyValuation';
import { ownershipBars, researchDate, researchMoney, researchNumber } from '../utils/companyResearchViews';
import { safeSourceUrl } from '../utils/newsroom';
import { Button } from './ui/Button';
import { EmptyState } from './ui/data';
import { Label } from './ui/Label';
import { SegmentedControl } from './ui/SegmentedControl';
import { Heading, Inline, Stack, Surface, Text } from './ui/layout';
import { ResearchBars, ResearchState, ResearchStats, useResearchRequest } from './ResearchPanelParts';
import styles from './company-research-panels.module.css';

const directions = { acquisition: ['Köp', 'positive'], subscription: ['Teckning', 'positive'], disposal: ['Sälj', 'negative'], loan_in: ['Inlån', ''], loan_out: ['Utlån', ''], other: ['Övrigt', ''] };

export default function CompanyOwnership({ symbol, price, currency = 'SEK' }) {
  const request = useResearchRequest(symbol, fetchInsiders);
  const [window, setWindow] = useState('365');
  const [count, setCount] = useState(6);
  const data = request.data;
  if (!data) return <ResearchState title="Insyn & ägare" request={request} />;
  const rows = data.transactions ?? [];
  const summary = data.summary?.[window === '90' ? 'last90Days' : 'last365Days'];
  const ownership = data.ownership?.available ? data.ownership : null;
  const owners = ownershipBars(ownership?.largestOwners);
  const people = new Map();
  for (const row of data.personHoldings ?? []) {
    if (!row.person) continue;
    const rolled = finite(row.estimatedShares) && row.estimatedShares >= 0 && !row.estimateInconsistent;
    people.set(row.person, { name: row.person, role: row.role, shares: rolled ? row.estimatedShares : row.shares,
      estimated: rolled && row.flowCount > 0 && row.estimatedShares !== row.shares, fiscalYear: row.fiscalYear, includesRelated: row.includesRelated, net: null });
  }
  for (const row of ownership?.leadership ?? []) if (row.name && !people.has(row.name)) people.set(row.name, { ...row, net: null });
  for (const row of rows) {
    if (!row.person) continue;
    const person = people.get(row.person) ?? { name: row.person, role: row.position, shares: null, net: null };
    if (!person.role) person.role = row.position;
    if (finite(row.value) && (!row.currency || row.currency === 'SEK')) {
      const direction = ['acquisition', 'subscription'].includes(row.direction) ? 1 : row.direction === 'disposal' ? -1 : 0;
      if (direction) person.net = (person.net ?? 0) + row.value * direction;
    }
    people.set(row.person, person);
  }
  const hasValue = summary && [summary.boughtValue, summary.soldValue].some(finite);
  const source = safeSourceUrl(ownership?.source?.attachmentUrl ?? ownership?.source?.url);
  const unsupported = data.status === 'unsupported';
  if (!rows.length && !ownership && !people.size) return <EmptyState
    title={unsupported ? 'Insynsregistret stöder inte marknaden ännu' : 'Insyns- och ägarunderlag saknas'}
    description={unsupported ? 'Rapporterad ägarbild saknas också i underlaget. Svenska FI-data ersätter inte ett annat lands register.' : 'Inga transaktioner eller rapporterade innehav finns i det hämtade underlaget.'} />;
  return <Stack className={styles.root} gap={6}>
    <div className={styles.grid}>
      <Surface className={styles.panel}><Stack gap={4}>
        <Inline className={styles.toolbar}><Heading as="h3" size="subsection">Insynshandel</Heading><SegmentedControl label="Period för insynshandel" value={window} onValueChange={setWindow} options={[{ value: '90', label: '3 mån' }, { value: '365', label: '12 mån' }]} /></Inline>
        {hasValue ? <>
          <ResearchStats items={[{ label: 'Netto', value: researchMoney(summary.netValue), tone: finite(summary.netValue) && summary.netValue !== 0 ? summary.netValue > 0 ? 'positive' : 'negative' : undefined }, { label: 'Köpare', value: researchNumber(summary.buyers, 0) }, { label: 'Säljare', value: researchNumber(summary.sellers, 0) }]} />
          <ResearchBars label="Köp och sälj i SEK" max={Math.max(summary.boughtValue ?? 0, summary.soldValue ?? 0)} rows={[
            { label: 'Köp & teckningar', value: summary.boughtValue, valueLabel: researchMoney(summary.boughtValue), tone: 'positive' },
            { label: 'Försäljningar', value: summary.soldValue, valueLabel: researchMoney(summary.soldValue), tone: 'negative' },
          ]} />
          <Text size="xs" tone="secondary">{researchNumber(summary.transactions, 0)} registrerade transaktioner · senaste {window === '90' ? '90' : '365'} dagarna · summerbara SEK-affärer</Text>
        </> : <Text size="sm" tone="secondary">{unsupported ? 'Insynsregistret stöder inte den här marknaden ännu.' : 'Insynsunderlag saknas för perioden.'}</Text>}
      </Stack></Surface>
      <Surface className={styles.panel}><Stack gap={4}>
        <Heading as="h3" size="subsection">Största ägare</Heading>
        {owners.length ? <>
          <Text size="xs" tone="secondary">Andel av kapitalet{ownership.ownersAsOf ? ` · ${ownership.ownersAsOf}` : ' · rapportdatum'}</Text>
          <ResearchBars label="Största ägarnas kapitalandel" rows={owners.slice(0, 5).map(row => ({ label: row.name, value: row.capitalPct, valueLabel: `${researchNumber(row.capitalPct)} %` }))} />
        </> : <Text size="sm" tone="secondary">Jämförbara kapitalandelar saknas. Tillgängliga innehav och röstandelar finns under ägarunderlaget.</Text>}
        {source && <a className={styles.sourceLink} href={source} target="_blank" rel="noreferrer">Ägarförteckning i rapporten <FiExternalLink aria-hidden="true" /></a>}
      </Stack></Surface>
    </div>
    {rows.length ? <Stack gap={3}>
      <Inline className={styles.toolbar}><Heading as="h3" size="subsection">Senaste transaktionerna</Heading><Text size="xs" tone="secondary">{Math.min(count, rows.length)} av {rows.length} inlästa</Text></Inline>
      <ol className={styles.transactions}>{rows.slice(0, count).map((row, index) => {
        const [label, tone] = directions[row.direction] ?? directions.other;
        const href = safeSourceUrl(row.url);
        return <li className={styles.transaction} key={row.txId ?? index}>
          <div className={styles.transactionIdentity}><Label>{label}</Label><div><strong>{row.person ?? 'Namn saknas'}</strong><Text size="xs" tone="secondary">{row.closelyAssociated ? 'Närstående till ' : ''}{row.position}</Text></div></div>
          <div className={styles.transactionTrade}><strong className={styles[tone] ?? ''}>{researchMoney(row.value, row.currency ?? 'SEK')}</strong><div className={styles.transactionMeta}>{finite(row.volume) && <span>{researchNumber(row.volume, 0)} {row.unit === 'Quantity' ? 'st' : row.unit ?? 'enheter'}</span>}{finite(row.price) && <span>{researchNumber(row.price, 2)} {row.currency ?? 'SEK'}{row.unit === 'Quantity' ? '/st' : ''}</span>}{row.instrumentType && <span>{row.instrumentType}</span>}</div></div>
          <div className={styles.transactionSource}><time>{researchDate(row.transactionDate ?? row.publishedAt)}</time>{href && <a className={styles.sourceLink} href={href} target="_blank" rel="noreferrer">FI-anmälan <FiExternalLink aria-hidden="true" /></a>}</div>
        </li>;
      })}</ol>
      {count < rows.length && <Button variant="secondary" onClick={() => setCount(value => value + 12)}>Visa fler transaktioner</Button>}
    </Stack> : <Text size="sm" tone="secondary">{unsupported ? 'Transaktioner från den här marknaden samlas inte in ännu.' : 'Inga transaktioner finns i det hämtade underlaget.'}</Text>}
    <details className={styles.details}><summary>Personinnehav, ägarunderlag & metod</summary><Stack gap={4}>
      {people.size > 0 && <div className={styles.tableWrap} role="region" aria-label="Insynspersoners innehav" tabIndex={0}><table className={styles.table}><caption>Insynspersoner · rapporterade eller framrullade innehav</caption><thead><tr><th>Person</th><th>Aktier</th><th>Värde vid visad kurs</th><th>Netto i inlästa affärer</th></tr></thead><tbody>{[...people.values()].sort((a, b) => (b.shares ?? -1) - (a.shares ?? -1)).map(row => <tr key={row.name}><th>{row.name}<Text size="xs" tone="secondary">{row.role}</Text></th><td>{researchNumber(row.shares, 0)}{row.estimated ? ' · uppskattat' : ''}{row.includesRelated ? ' · inkl. närstående' : ''}{row.fiscalYear ? ` · ÅR ${row.fiscalYear}` : ''}</td><td>{finite(price) && finite(row.shares) ? researchMoney(price * row.shares, currency) : 'Saknas'}</td><td>{researchMoney(row.net)}</td></tr>)}</tbody></table></div>}
      {ownership?.largestOwners?.length > 0 && <div className={styles.tableWrap} role="region" aria-label="Alla ägare i rapportunderlaget" tabIndex={0}><table className={styles.table}><thead><tr><th>Ägare</th><th>Aktier</th><th>Kapital</th><th>Röster</th></tr></thead><tbody>{ownership.largestOwners.map(row => <tr key={row.name}><th>{row.name}</th><td>{researchNumber(row.shares, 0)}</td><td>{finite(row.capitalPct) ? `${researchNumber(row.capitalPct)} %` : 'Saknas'}</td><td>{finite(row.votesPct) ? `${researchNumber(row.votesPct)} %` : 'Saknas'}</td></tr>)}</tbody></table></div>}
      <Text size="sm">FI:s insynsregister visar anmälda transaktioner, inte personernas totala innehav. Köpsidan inkluderar teckningar; aktielån ingår inte i köp/sälj. Summeringen använder enbart affärer i SEK med beräkningsbart värde och kan begränsas av det hämtade underlaget.</Text>
      <Text size="sm">Ägarandelar avser rapportens datum, inte dagens ägarbild. Personinnehav kan vara framrullade med registrerade affärer och märks då uppskattat. Staplarna visar kapitalandelar på en 0–100 %-skala; okända ägare fylls inte ut som en restpost.</Text>
      {!people.size && !ownership && <Text size="sm" tone="secondary">Rapporterade person- och ägarinnehav saknas.</Text>}
    </Stack></details>
  </Stack>;
}
