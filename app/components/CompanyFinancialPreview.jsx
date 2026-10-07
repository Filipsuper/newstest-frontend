"use client";

import { usePublicPreview } from './usePublicPreview';
import { ResultChart } from './CompanyFinancialOverview';
import UpgradeLink from './UpgradeLink';
import { PreviewGate } from './ui/PreviewGate';
import { Button } from './ui/Button';
import { Skeleton } from './ui/data';
import { Heading, Stack, Text } from './ui/layout';
import { financialScale, financialSource } from '../utils/companyResearch';
import styles from './research-preview.module.css';

const number = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
export default function CompanyFinancialPreview({ symbol }) {
  const { data, error, retry } = usePublicPreview(`company/${symbol}/financial-preview`);
  const actual = data?.symbol === symbol ? (data.annual ?? []).map(period => ({ ...period, label: period.periodEnd.slice(0, 4) })) : [];
  const scale = financialScale(actual, data?.currency);
  return <PreviewGate label="Plus" title="Förstå vad som händer bakom kursen"
    description="Följ lönsamhet, kassaflöde och skuldsättning över tid. Växla mellan kvartal och helår och gå tillbaka till rapportunderlaget."
    action={<UpgradeLink tier="plus" fallback="Utforska Plus" />}>
    <Stack gap={4} className={styles.financialSample}>
      <Stack gap={1}><Heading as="h3" size="subsection">Omsättning och rörelseresultat</Heading>
        <Text size="xs" tone="secondary">Förhandsvisning · rapporterade helår</Text></Stack>
      {error ? <Stack gap={3}><Text size="sm" tone="secondary">Förhandsvisningen kunde inte hämtas.</Text><Button variant="secondary" onClick={retry}>Försök igen</Button></Stack>
        : !data ? <div role="status" aria-label="Hämtar finansiell förhandsvisning"><Skeleton className={styles.tableLoader} /></div>
        : !actual.length ? <Text size="sm" tone="secondary">Rapporterad helårshistorik saknas för det här bolaget.</Text>
        : <>
          <ResultChart actual={actual} currency={data.currency} scale={scale} source={actual.at(-1)?.source} />
          <details><summary className={styles.sourceToggle}>Värden och källor</summary>
            <table className={styles.financialTable} aria-label={`Offentligt finansiellt smakprov, ${scale.label}`}>
              <thead><tr><th scope="col">Periodslut</th><th scope="col">Omsättning · {scale.label}</th><th scope="col">EBIT · {scale.label}</th></tr></thead>
              <tbody>{actual.map(period => <tr key={period.periodEnd}><th scope="row">{period.periodEnd}</th>
                {['revenue', 'ebit'].map(key => <td key={key}>{Number.isFinite(period[key]) ? number.format(period[key] / scale.divisor) : 'Saknas'}</td>)}
              </tr>)}</tbody>
            </table>
            {[...new Set(actual.map(period => period.source))].map(source => <Text key={source ?? 'missing'} size="xs" tone="secondary">{financialSource(source) === 'Källa ej angiven' ? source || 'Källa ej angiven' : financialSource(source)}</Text>)}
          </details>
        </>}
    </Stack>
    <div className={styles.continuation} aria-label="Fler analyser i Plus">
      <div><Text size="sm">Kassaflöde</Text><Text size="xs" tone="secondary">Från driften till fritt kassaflöde</Text></div>
      <div><Text size="sm">Skuldsättning</Text><Text size="xs" tone="secondary">Kassa, skuld och nettoskuld</Text></div>
    </div>
  </PreviewGate>;
}
