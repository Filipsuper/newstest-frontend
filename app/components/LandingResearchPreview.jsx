import Link from 'next/link';
import { Label } from './ui/Label';
import { Heading, Inline, Stack, Text, cx } from './ui/layout';
import { LANDING_RESEARCH_EXAMPLE } from '../utils/landingResearch';
import styles from './landing-research.module.css';

const number = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 });
const date = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const series = [
  { key: 'revenue', label: 'Omsättning', className: styles.revenue },
  { key: 'ebit', label: 'EBIT', className: styles.ebit },
];

export default function LandingResearchPreview({ className }) {
  const example = LANDING_RESEARCH_EXAMPLE;
  const latest = example.annual.at(-1);
  const firstYear = example.annual[0].periodEnd.slice(0, 4);
  const lastYear = latest.periodEnd.slice(0, 4);
  const captureDate = date.format(new Date(`${example.capturedAt}T12:00:00Z`));
  const divisor = 1e9;
  const ceiling = Math.ceil(Math.max(...example.annual.flatMap(row => [row.revenue, row.ebit])) / (50 * divisor)) * 50;
  const chartHeight = 108;
  const baseline = 114;
  const y = value => baseline - value / divisor / ceiling * chartHeight;
  const chartDescription = example.annual.map(row => `${row.periodEnd.slice(0, 4)}: omsättning ${exact.format(row.revenue / divisor)}, EBIT ${exact.format(row.ebit / divisor)}`).join('; ');

  return <Stack as="figure" gap={3} className={cx(styles.preview, className)} aria-label={`${example.name}, finansiellt exempel`}>
    <Inline className={styles.header} gap={3}>
      <Link className={styles.company} href={`/aktie/${encodeURIComponent(example.symbol)}`}>
        <Heading as="h3" size="subsection">{example.name}</Heading>
        <Text size="xs" tone="secondary">Helår {firstYear}–{lastYear}</Text>
      </Link>
      <Label aria-label={`Exempel hämtat ${captureDate}. Rapporterade helår från ${example.source}, inte löpande uppdaterade uppgifter.`}>Exempel</Label>
    </Inline>

    <Inline gap={4} className={styles.legend}>
      {series.map(metric => <Text key={metric.key} as="span" size="xs" tone="secondary" className={styles.legendItem}>
        <span aria-hidden="true" className={cx(styles.mark, metric.className)} />
        {metric.label}
        <Text as="span" size="sm" numeric>{number.format(latest[metric.key] / divisor)}</Text>
      </Text>)}
      <Text as="span" size="xs" tone="secondary">Mdr SEK · {lastYear}</Text>
    </Inline>

    <svg className={styles.chart} width="100%" height="148" role="img"
      aria-label={`Omsättning och EBIT i miljarder SEK, rapporterade helår. ${chartDescription}. Källa: ${example.source}.`}>
      {[ceiling, ceiling / 2, 0].map(value => <g key={value} aria-hidden="true">
        <text x="0" y={y(value * divisor) + 4}>{number.format(value)}</text>
        <line x1="11%" x2="100%" y1={y(value * divisor)} y2={y(value * divisor)} className={value === 0 ? styles.baseline : styles.grid} />
      </g>)}
      {example.annual.map((row, index) => {
        const center = 11 + (index + .5) / example.annual.length * 89;
        return <g key={row.periodEnd}>
          {series.map((metric, metricIndex) => <rect key={metric.key} className={metric.className}
            x={`${center - 6.5 + metricIndex * 7}%`} width="6%" y={y(row[metric.key])}
            height={baseline - y(row[metric.key])} rx="2">
            <title>{`${row.periodEnd.slice(0, 4)} · ${metric.label}: ${exact.format(row[metric.key] / divisor)} miljarder SEK, rapporterat`}</title>
          </rect>)}
          <text x={`${center}%`} y="138" textAnchor="middle" aria-hidden="true">{row.periodEnd.slice(0, 4)}</text>
        </g>;
      })}
    </svg>

    <Inline as="figcaption" gap={2} className={styles.caption}>
      <Text size="xs" tone="secondary">Rapporterat • år · {example.source}</Text>
      <Text as="time" dateTime={example.capturedAt} size="xs" tone="secondary">{captureDate}</Text>
    </Inline>
  </Stack>;
}
