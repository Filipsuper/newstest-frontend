import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Affärsområden · lokal datapilot', robots: { index: false, follow: false } };

export default async function Page() {
  if (process.env.NODE_ENV !== 'development' && process.env.SEGMENT_REVENUE_PREVIEW !== '1') notFound();
  const [{ default: CompanySegmentRevenue }, { Container, Heading, Stack, Text }, { default: reports }, { default: styles }] = await Promise.all([
    import('../../components/CompanySegmentRevenue'), import('../../components/ui/layout'),
    import('./reviewed-reports.json'), import('../../components/company-segments.module.css'),
  ]);
  return <Container as="main" className={styles.preview}><Stack gap={6}>
    <Stack gap={2}>
      <Heading as="h1" size="page">Affärsområden</Heading>
      <Text tone="secondary">Lokal datapilot · tre källgranskade årsrapporter. Historiska rapportvärden, inte live-data.</Text>
    </Stack>
    <div className={styles.examples}>
      {reports.map(record => <Stack key={record.symbol} gap={3}>
        <Heading as="h2" size="subsection">{record.company}</Heading>
        <CompanySegmentRevenue record={record} />
      </Stack>)}
    </div>
  </Stack></Container>;
}
