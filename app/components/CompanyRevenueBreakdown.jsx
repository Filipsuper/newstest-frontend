import { Heading, Stack, Text, cx } from './ui/layout';
import DonutChart from './ui/DonutChart';
import styles from './company-segments.module.css';

const number = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
const share = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const colors = Array.from({ length: 6 }, (_, index) => `var(--ui-chart-${index + 1})`);

/** Shared presentation for already-qualified business and geographic revenue. */
export default function CompanyRevenueBreakdown({ data, className }) {
  if (!data) return null;
  const dimension = data.dimension === 'country' ? 'land' : data.dimension === 'region' ? 'region' : 'affärsområde';
  const title = `Omsättning per ${dimension}`;
  const year = data.fiscalPeriod.slice(0, 4);
  const unit = data.unitMultiplier === 1e6 ? `M${data.currency}` : data.unitMultiplier === 1000 ? `k${data.currency}` : data.currency;
  // Keep many-segment reports readable without recycling category colors.
  const showDonut = data.segments.length <= colors.length;
  const series = data.segments.map((row, index) => ({ key: row.label, sharePct: row.sharePct, color: colors[index] }));
  return <section className={cx(styles.panel, className)} aria-label={title}>
    <Stack gap={1}>
      <Heading as="h3" size="subsection" className={styles.heading}>{title}</Heading>
      {!showDonut && <Text size="xs" tone="secondary">{year} · {unit} · Extern omsättning</Text>}
    </Stack>
    <div className={showDonut ? styles.composition : undefined}>
      {showDonut && <DonutChart series={series} label={`Extern omsättning ${year}: ${number.format(data.total / data.unitMultiplier)} ${unit}. Fördelning per ${dimension} finns i listan intill.`}>
        <Text size="xs" tone="secondary">Omsättning</Text>
        <Text numeric className={styles.total}>{number.format(data.total / data.unitMultiplier)}</Text>
        <Text size="xs" tone="secondary">{unit} · {year}</Text>
      </DonutChart>}
      <dl className={styles.rows}>
        {data.segments.map((row, index) => <div key={row.label} className={styles.row}>
          <dt>
            {showDonut && <span className={styles.marker} style={{ background: colors[index] }} aria-hidden="true" />}
            <Text as="span" size="sm">{row.label}</Text>
          </dt>
          <dd className={styles.values}>
            <Text as="span" size="sm" numeric>{number.format(row.revenue / data.unitMultiplier)}</Text>
            <Text as="span" size="xs" tone="secondary" numeric>{share.format(row.sharePct)} %</Text>
          </dd>
          {!showDonut && <dd className={styles.track} aria-hidden="true"><span style={{ width: `${row.sharePct}%` }} /></dd>}
        </div>)}
      </dl>
    </div>
    <details className={styles.source}>
      <summary>Rapportkälla</summary>
      <Stack gap={3}>
        <Text size="sm" tone="secondary">Andel av koncernens externa omsättning: {number.format(data.total / data.unitMultiplier)} {unit}. Intern försäljning ingår inte. {data.dimension === 'business_area' ? 'Koncerngemensamma poster behåller rapportens egna namn.' : 'Fördelning efter kundernas geografiska placering, med rapportens egna namn.'}</Text>
        {data.geographicBasisEvidence && <Text size="sm" tone="secondary">Rapportens definition: {data.geographicBasisEvidence.text}</Text>}
        {data.difference !== 0 && <Text size="sm" tone="secondary">Avrundning i rapporten: delposternas summa avviker med {number.format(data.difference / data.unitMultiplier)} {unit} från koncerntotalen. Andelarna har inte justerats till 100 %.</Text>}
        <a href={data.href} target="_blank" rel="noreferrer">Årsrapport {year} · s. {data.source.printedPage}</a>
      </Stack>
    </details>
  </section>;
}
