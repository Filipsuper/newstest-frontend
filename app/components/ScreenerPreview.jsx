"use client";

import Link from 'next/link';
import CompanyProfileRadar from './CompanyProfileRadar';
import { usePublicPreview } from './usePublicPreview';
import { PreviewGate } from './ui/PreviewGate';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Heading, Inline, Stack, Text } from './ui/layout';
import { ChangeBadge, Skeleton } from './ui/data';
import { formatScreenerValue } from '../utils/screener';
import styles from './research-preview.module.css';

export default function ScreenerPreview({ onLogin }) {
  const { data, error, retry } = usePublicPreview('screener-preview');
  return <Stack gap={4}>
    <Stack gap={2} className={styles.intro}>
      <Heading as="h1" size="page">Hitta nästa bolag att följa</Heading>
      <Text size="sm" tone="secondary">Jämför bolag, upptäck mönster och hitta det som passar dig.</Text>
      <Inline gap={2} className={styles.examples}>
        <Label>Nyheter med volym</Label><Label>Insynsköp</Label><Label>Lönsamma bolag</Label>
      </Inline>
    </Stack>
    <PreviewGate label="Gratis konto" title="Gör urvalet till ditt eget"
      description="Prova sex nyckeltal, kombinera egna filter och öppna bolagen direkt i screenern."
      note="Plus ger dig fler fundamentala mått, insynsdata och tekniska filter."
      action={<Button onClick={onLogin}>Prova screenern gratis</Button>} fade={Boolean(data?.items?.length)}>
      <Inline className={styles.sampleHeader} gap={3}><Text size="sm">Bolag och nyckeltal</Text><Text size="xs" tone="secondary">Förhandsvisning · ett urval</Text></Inline>
      {error ? <Stack gap={3} className={styles.placeholder}><Text size="sm" tone="secondary">Förhandsvisningen kunde inte hämtas.</Text><Button variant="secondary" onClick={retry}>Försök igen</Button></Stack>
        : !data ? <div className={styles.placeholder} role="status" aria-label="Hämtar förhandsvisning"><Skeleton className={styles.tableLoader} /></div>
        : !data.items?.length ? <Text size="sm" tone="secondary" className={styles.placeholder}>Bolagsdata saknas just nu.</Text>
        : <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Förhandsvisning av screenern, fler nyckeltal åt höger">
          <table className={styles.table} aria-label="Screenerns offentliga smakprov">
            <thead><tr><th scope="col">Bolag</th><th scope="col">Kurs</th><th scope="col">Idag</th><th scope="col">Börsvärde · mdkr</th><th scope="col">Tillväxt</th><th scope="col">EBIT-marginal</th><th scope="col">P/E</th></tr></thead>
            <tbody>{data.items.slice(0, 6).map(row => <tr key={row.symbol}>
              <td><Link href={`/aktie/${encodeURIComponent(row.symbol)}`} className={styles.company}>
                <CompanyProfileRadar compact profile={row.profile} companyName={row.name ?? row.symbol} />
                <span><strong>{row.name ?? row.symbol}</strong><small>{row.nativeSymbol ?? row.symbol}</small></span>
              </Link></td>
              <td>{formatScreenerValue(row.price, 'price', row.currency ?? '')}</td>
              <td><ChangeBadge value={row.changePct} /></td>
              {['marketCap', 'revenueGrowthPct', 'ebitMarginPct', 'pe'].map(key => <td key={key}>{formatScreenerValue(row.fundamentals?.[key], key.endsWith('Pct') ? 'pct' : key === 'pe' ? 'multiple' : null)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>}
    </PreviewGate>
  </Stack>;
}
