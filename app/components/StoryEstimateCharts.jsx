'use client';

import { useId, useState } from 'react';
import { FinancialBarChart, FinancialLineChart } from './charts/DataCharts';
import { Button } from './ui/Button';
import { Heading, Inline, Stack, Text } from './ui/layout';
import { validReaderStoryEstimateContext } from '../utils/storyEstimateContext';
import styles from './charts/data-charts.module.css';

export default function StoryEstimateCharts({ article, context, onInspectEstimate }) {
  const [kind, setKind] = useState('bar');
  const headingId = useId();
  if (!validReaderStoryEstimateContext(context, article)) return null;
  const Chart = kind === 'bar' ? FinancialBarChart : FinancialLineChart;
  const date = new Date(context.capturedAt).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'medium', timeStyle: 'short' });
  return <section aria-labelledby={headingId}><Stack gap={4}>
    <Heading id={headingId} size="subsection">Utfall och estimat</Heading>
    {context.origin === 'simulated_test' && <Text size="sm">Fiktiva estimat för UI-test · inte verkliga bolagsprognoser.</Text>}
    <Text size="sm" tone="secondary">Separat faktaruta från OMXsum · underlag sparat {date}. Estimat är prognoser, inte utfall. De ingår inte i artikelns sparade AI-text.</Text>
    <Inline role="group" aria-label="Grafvy för utfall och estimat">
      <Button variant="secondary" aria-pressed={kind === 'bar'} onClick={() => setKind('bar')}>Staplar</Button>
      <Button variant="secondary" aria-pressed={kind === 'line'} onClick={() => setKind('line')}>Linjer</Button>
    </Inline>
    {context.charts.map(chart => <Chart key={chart.id} {...chart} headingAs="h3" renderMode="static" compactValues forecastStep={chart.frequency === 'annual' ? 4 : 1}
      meta={`${chart.frequency === 'annual' ? 'Helår' : 'Kvartal'}${chart.epsBasis ? ` · ${chart.epsBasis === 'dilutedEps' ? 'utspädd' : 'outspädd'} EPS` : ''}`}
      renderValue={({ row, series, formatted }) => <>{formatted}{onInspectEstimate && row.values[series.key] !== null && <button
        className={styles.inspectValue} onClick={() => onInspectEstimate(row.evidenceId)}
        aria-label={`Granska ${chart.title} ${row.label} ${series.label}`}>Underlag ↗</button>}</>} />)}
    <Text size="xs" tone="secondary">Konsensus prioriteras per mått och period. OMXsum-estimat används när kvalificerat konsensus saknas. Kvartal räknas inte om till helår, och saknade värden blir inte noll.</Text>
  </Stack></section>;
}
