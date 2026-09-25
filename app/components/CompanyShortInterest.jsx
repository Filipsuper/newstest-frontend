"use client";

import { useMemo, useState } from 'react';
import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchShorts } from '../utils/api';
import { finite } from '../utils/companyValuation';
import { shortSeries, researchNumber, researchDate } from '../utils/companyResearchViews';
import { Heading, Inline, Stack, Surface, Text } from './ui/layout';
import { EmptyState } from './ui/data';
import { SegmentedControl } from './ui/SegmentedControl';
import { ResearchBars, ResearchState, ResearchStats, useResearchRequest } from './ResearchPanelParts';
import styles from './company-research-panels.module.css';

export default function CompanyShortInterest({ symbol }) {
  const request = useResearchRequest(symbol, fetchShorts);
  const [range, setRange] = useState('12m');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const data = request.data;
  const points = useMemo(() => shortSeries(data, range), [data, range]);
  const positions = (data?.positions ?? []).filter(row => row.holder && finite(row.pct) && row.pct >= 0 && row.pct <= 100).slice().sort((a, b) => b.pct - a.pct);
  const aggregate = data?.aggregate;
  const positionsKnown = Array.isArray(data?.positions) && positions.length === data.positions.length;
  const sum = positions.reduce((total, row) => total + row.pct, 0);
  if (!data) return <ResearchState title="Blankningsdata" request={request} />;
  if (data.status === 'unsupported') return <EmptyState title="Blankningsregistret stöder inte marknaden ännu" description="Svenska FI-data används inte som ersättning för ett annat lands register." />;
  if (!data.available && !points.length && !positions.length) return <EmptyState title="Blankningsunderlag saknas" description="Inga publicerade positioner finns i underlaget. Det betyder inte att aktien saknar blankning." />;
  return <Stack className={styles.root} gap={4}>
    <Surface className={styles.panel}><Stack gap={6}>
      <ResearchStats items={[
        { label: 'FI-aggregat', value: finite(aggregate?.pct) ? `${researchNumber(aggregate.pct, 2)} %` : 'Saknas' },
        { label: 'Namngivna', value: positionsKnown ? `${researchNumber(sum, 2)} %` : 'Saknas' },
        { label: 'Innehavare', value: positionsKnown ? String(positions.length) : 'Saknas' },
      ]} />
      {aggregate?.positionDate && <Text size="xs" tone="secondary">FI-aggregat per {researchDate(aggregate.positionDate)}</Text>}
      {points.length > 0 && <>
        <Inline className={styles.toolbar}><Heading as="h3" size="subsection">Namngivna positioner över tid</Heading><SegmentedControl label="Blankningsperiod" value={range} onValueChange={setRange} options={[{ value: '3m', label: '3 mån' }, { value: '12m', label: '12 mån' }, { value: 'full', label: 'Max' }]} /></Inline>
        <div className={styles.chart} role="img" aria-label={`Namngiven blankning, ${researchDate(points[0].date)} till ${researchDate(points.at(-1).date)}. Senast ${researchNumber(points.at(-1).pct, 2)} procent.`}>
          <ResponsiveContainer width="100%" height="100%"><ComposedChart aria-hidden="true" data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} tickCount={4} minTickGap={36} axisLine={false} tickLine={false} tickFormatter={time => new Date(time).toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' })} />
            <YAxis width={56} domain={[0, 'auto']} tickCount={4} axisLine={false} tickLine={false} tickFormatter={value => `${researchNumber(value)} %`} />
            <Tooltip content={({ active, payload }) => active && payload?.length ? <div className={styles.tooltip}><Text size="xs" tone="secondary">{researchDate(payload[0].payload.date)}</Text><Text numeric>{researchNumber(payload[0].value, 2)} % · namngivna</Text></div> : null} />
            <Area dataKey="pct" type="stepAfter" stroke="var(--ui-chart-1)" strokeWidth={2} fill="var(--ui-chart-1)" fillOpacity={.12} dot={points.length === 1 ? { r: 3 } : false} isAnimationActive={false} />
          </ComposedChart></ResponsiveContainer>
        </div>
        <Text size="xs" tone="secondary">Senaste historikpunkt {researchDate(points.at(-1).date)} · av aktiekapitalet</Text>
      </>}
    </Stack></Surface>
    {positions.length > 0 && <Surface className={styles.panel}><Stack gap={4}>
      <Heading as="h3" size="subsection">Offentliggjorda innehavare</Heading>
      <ResearchBars label="Blankning per innehavare" max={Math.max(...positions.map(row => row.pct))} rows={positions.map(row => ({ label: row.holder, value: row.pct, valueLabel: `${researchNumber(row.pct, 2)} %`, detail: `${researchDate(row.positionDate)} · av kapitalet` }))} />
      <Text size="xs" tone="secondary">Staplar jämför innehavarnas positioner, inte andel av all blankning.</Text>
    </Stack></Surface>}
    <details className={styles.details} onToggle={event => setDetailsOpen(event.currentTarget.open)}><summary>Register, datum & historik</summary>{detailsOpen && <Stack gap={4}>
      <Text size="sm">Källa: Finansinspektionens blankningsregister. Namngivna positioner offentliggörs från 0,5 % av aktiekapitalet. FI-aggregatet omfattar anmälda positioner från 0,1 %, inte all blankning. Historiken visar namngivna positioner och behåller anmäld nivå till nästa förändring.</Text>
      <Text size="sm">FI-aggregat: {researchDate(aggregate?.date ?? aggregate?.positionDate)}. Innehavarna kan ha olika anmälningsdatum. Skillnaden mellan aggregat och namngivna positioner visas därför inte som ett beräknat innehav.</Text>
      {points.length > 0 && <div className={styles.tableWrap} role="region" aria-label="Blankningshistorik" tabIndex={0}><table className={styles.table}><thead><tr><th>Datum</th><th>Namngiven blankning</th></tr></thead><tbody>{points.map(row => <tr key={row.date}><th>{researchDate(row.date)}</th><td>{researchNumber(row.pct, 2)} %</td></tr>)}</tbody></table></div>}
    </Stack>}</details>
  </Stack>;
}
