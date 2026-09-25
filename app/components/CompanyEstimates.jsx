"use client";

import { useId, useMemo } from 'react';
import { Bar, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { estimateViews, researchNumber, researchMoney, researchDate } from '../utils/companyResearchViews';
import { finite } from '../utils/companyValuation';
import { safeSourceUrl } from '../utils/newsroom';
import { EmptyState } from './ui/data';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Heading, Inline, Stack, Surface, Text } from './ui/layout';
import styles from './company-research-panels.module.css';
import { FiscalPeriodTick } from './ResearchPanelParts';

function ForecastPanel({ view }) {
  const pattern = `forecast-${useId().replace(/:/g, '')}`;
  const first = view.forecasts[0];
  const largest = Math.max(...view.bars.filter(row => finite(row.value)).map(row => Math.abs(row.value)), 0);
  const scale = view.metric === 'eps' ? 1 : largest >= 1e9 ? 1e9 : largest >= 1e6 ? 1e6 : largest >= 1e3 ? 1e3 : 1;
  const unit = `${scale === 1e9 ? 'md ' : scale === 1e6 ? 'M ' : scale === 1e3 ? 't ' : ''}${view.currency}${view.metric === 'eps' ? '/aktie' : ''}`;
  const value = amount => view.metric === 'eps' ? `${researchNumber(amount, 2)} ${view.currency}/aktie` : researchMoney(amount, view.currency);
  return <Surface className={styles.panel}><Stack gap={4}>
    <div className={styles.forecastHeader}>
      <Inline className={styles.toolbar}><Heading as="h3" size="subsection">{view.title}</Heading><Label>{first.sourceLabel}</Label></Inline>
      <span className={styles.forecastValue}>{value(first.value)}</span>
      <Text size="xs" tone="secondary">{first.period.label}E · {view.frequency === 'quarterly' ? 'Kvartal' : 'Helår'}</Text>
    </div>
    <div className={styles.chart} role="img" aria-label={`${view.title}, ${unit}. ${view.bars.map(row => `${row.label}: ${finite(row.value) ? value(row.value) : 'Saknas'}, ${row.sourceLabel}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%"><ComposedChart aria-hidden="true" data={view.bars.map(row => ({ ...row, plotted: finite(row.value) ? row.value / scale : null }))} margin={{ top: 8, right: 0, bottom: 0, left: -12 }}>
        <defs><pattern id={pattern} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--ui-accent-soft)" /><line x1="0" x2="0" y1="0" y2="6" stroke="var(--ui-chart-1)" strokeWidth="2" /></pattern></defs>
        <XAxis dataKey="label" interval={0} height={38} tick={<FiscalPeriodTick />} axisLine={false} tickLine={false} />
        <YAxis width={52} axisLine={false} tickLine={false} tickCount={4} tickFormatter={v => researchNumber(v)} domain={[min => Math.min(0, min), max => Math.max(0, max)]} />
        <ReferenceLine y={0} stroke="var(--ui-border)" />
        <Tooltip cursor={false} content={({ active, payload }) => active && payload?.length ? <div className={styles.tooltip}><Text size="xs" tone="secondary">{payload[0].payload.label} · {payload[0].payload.sourceLabel}</Text><Text numeric>{value(payload[0].payload.value)}</Text></div> : null} />
        <Bar dataKey="plotted" maxBarSize={40} isAnimationActive={false} radius={[4, 4, 0, 0]}>{view.bars.map(row => <Cell key={row.label} fill={row.source === 'reported' ? 'var(--ui-chart-1)' : `url(#${pattern})`} />)}</Bar>
      </ComposedChart></ResponsiveContainer>
    </div>
    <Inline gap={4} className={styles.legend}><span><i className={styles.mark} />Rapporterat</span><span><i className={`${styles.mark} ${styles.estimateMark}`} />Estimat</span><span>{unit}</span></Inline>
  </Stack></Surface>;
}

export default function CompanyEstimates({ symbol, financials, estimates, availability, financialAvailability }) {
  const views = useMemo(() => estimateViews({ symbol, financials, estimates, availability }), [symbol, financials, estimates, availability]);
  const available = views.filter(view => view.forecasts.length);
  if (availability === 'unavailable' || financialAvailability === 'unavailable' || !estimates) return <EmptyState title="Estimatunderlaget kunde inte hämtas" action={<Button variant="secondary" onClick={() => window.location.reload()}>Försök igen</Button>} />;
  if (!available.length) return <EmptyState title="Inga jämförbara estimat ännu" description="Konsensus och kvalificerade OMXsum-estimat visas här när underlag finns för kommande perioder." />;
  return <Stack className={styles.root} gap={4}>
    <div className={`${styles.grid} ${styles.estimateGrid}`}>{available.map(view => <ForecastPanel key={view.metric} view={view} />)}</div>
    {available.length < views.length && <Text size="sm" tone="secondary">Estimat saknas för {views.filter(view => !view.forecasts.length).map(view => view.title.toLowerCase()).join(' och ')}.</Text>}
    <details className={styles.details}>
      <summary>Estimatens källor & underlag</summary>
      <Stack gap={4}>
        <Text size="sm">Konsensus prioriteras för varje mått och period. När jämförbart konsensus saknas används ett kvalificerat OMXsum-estimat. Streckade staplar är estimat, inte rapporterade utfall. Kvartal räknas inte om till helår.</Text>
        <div className={styles.tableWrap} role="region" aria-label="Estimatens underlag" tabIndex={0}><table className={styles.table}>
          <thead><tr><th>Mått</th><th>Period</th><th>Värde</th><th>Källa</th><th>Datum</th></tr></thead>
          <tbody>{available.flatMap(view => view.bars.map(row => <tr key={`${view.metric}-${row.label}`}><th>{view.title}</th><td>{row.label}</td><td>{researchNumber(row.value, 2)} {view.currency}{view.metric === 'eps' ? '/aktie' : ''}</td><td>{row.sourceLabel}{row.publisher && ` · ${row.publisher}`}{safeSourceUrl(row.url) && <a href={safeSourceUrl(row.url)} target="_blank" rel="noreferrer">Öppna källa ↗</a>}</td><td>{researchDate(row.asOf)}</td></tr>))}</tbody>
        </table></div>
        {available.some(view => view.forecasts.some(row => row.source === 'model')) && <Text size="sm">OMXsum-modellen använder rapporthistorik för tillväxt, säsong och marginaler. Ett modellestimat är inte analytikerkonsensus eller en riktkurs.</Text>}
        {available.some(view => view.metric === 'eps') && <Text size="sm">Vinst per aktie jämför {views.find(view => view.metric === 'eps').epsBasis === 'dilutedEps' ? 'utspädd' : 'outspädd'} EPS i både historik och estimat.</Text>}
        <Text size="xs" tone="secondary">Konsensus: högst 90 dagar gammalt. OMXsum-modell: högst 30 dagar. Valuta, period och resultatdefinition måste matcha. EPS visas endast med angiven aktiebas.</Text>
      </Stack>
    </details>
  </Stack>;
}
