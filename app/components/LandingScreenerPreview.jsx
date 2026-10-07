import Link from 'next/link';
import { FiSliders } from 'react-icons/fi';
import CompanyProfileRadar from './CompanyProfileRadar';
import { Label } from './ui/Label';
import { Inline, Text } from './ui/layout';
import { formatScreenerValue } from '../utils/screener';
import { LANDING_SCREENER_EXAMPLE } from '../utils/landingScreener';
import styles from './landing-screener.module.css';

export default function LandingScreenerPreview() {
  const example = LANDING_SCREENER_EXAMPLE;
  return <div className={styles.preview}>
    <Inline className={styles.header}>
      <Inline gap={2} className={styles.filter}>
        <FiSliders aria-hidden="true" />
        <Text as="span" size="xs">{example.filter.label}</Text>
      </Inline>
      <Label aria-label="Bolagsexempel verifierade 3 oktober 2026, rapporterat helår 2025. Inte hela marknaden eller ett liveurval.">Exempel</Label>
    </Inline>
    <ul className={styles.results} aria-label="Tre exempel på bolag att utforska">
      {example.items.map(row => <li key={row.symbol}>
        <Link href={`/aktie/${encodeURIComponent(row.symbol)}`} className={styles.result}
          aria-label={`${row.name}, EBIT-marginal ${formatScreenerValue(row.value, 'pct')}. Utforska bolaget.`}>
          <CompanyProfileRadar compact showPoints={false} profile={row.profile} companyName={row.name} />
          <div className={styles.identity}>
            <Text className={styles.name}>{row.name}</Text>
            <Text size="xs" tone="secondary">{row.sector}</Text>
          </div>
          <span className={styles.value}>{formatScreenerValue(row.value, 'pct')}</span>
        </Link>
      </li>)}
    </ul>
  </div>;
}
