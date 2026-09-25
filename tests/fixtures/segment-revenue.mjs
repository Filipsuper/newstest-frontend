import { readFileSync } from 'node:fs';

// Local API fixtures only. Never imported by application components or routes.
const reports = JSON.parse(readFileSync(new URL('../../app/designsystem/segments/reviewed-reports.json', import.meta.url)));

export function reviewedCompanyOverview(symbol) {
  const report = reports.find(record => record.symbol === symbol);
  if (!report) return null;
  return {
    symbol,
    access: { plus: true },
    availability: { financials: 'available', reports: 'available' },
    summary: {
      symbol, profile: { symbol, name: report.company, nativeSymbol: symbol.replace('.ST', ''), currency: report.currency,
        description: 'Lokal rapportförhandsvisning. Segmentintäkterna är källgranskade; aktuell kursdata ingår inte i denna testmiljö.' },
      quote: null, calendar: {}, financialHighlights: null,
    },
    chart: { symbol, bars: [] }, news: [], reports: [], estimates: null,
    financials: { symbol, currency: report.currency, source: 'issuer_report', annual: [], quarterly: [], ttm: [],
      segmentRevenue: report, managementComment: null,
      latestReport: { fiscalPeriod: report.fiscalPeriod, attachmentUrl: report.source.url },
    },
  };
}

export function fictionalSegmentRevenue(symbol) {
  const components = symbol === 'SEGMENT-MANY.TEST'
    ? ['Område A', 'Område B', 'Område C', 'Område D', 'Område E', 'Område F', 'Område G'].map((label, i) => [label, i < 3 ? 24 : 12])
    : [['Industriprodukter', 72], ['Service', 36], ['Energi', 12]];
  return {
    schemaVersion: 1, status: 'available', symbol, company: 'Norden Industri (fiktivt)',
    dimension: 'business_area', basis: 'external_customer_revenue',
    frequency: 'annual', fiscalPeriod: '2025-FY', periodEnd: '2025-12-31', currency: 'SEK', unitMultiplier: 1e6,
    source: { url: 'https://example.test/fictional-segments.pdf', pdfSha256: 'f'.repeat(64), pdfPage: 12, printedPage: '12' },
    verification: { method: 'reviewed_pdf_layout', profileId: 'fictional-layout-test', reviewedAt: '2026-09-24' },
    rows: [...components.map(([label, amount]) => [label, 'segment', amount]), ['Group', 'group', 120]]
      .map(([label, role, amount]) => ({ label, role, revenue: amount * 1e6, evidence: { cellText: String(amount), pdfPage: 12 } })),
  };
}

// Deliberately fictional: no geography has been extracted for the real-company
// report previews. The UI contract must not invent their customer distribution.
export function fictionalGeographicRevenue(symbol) {
  const record = fictionalSegmentRevenue(symbol);
  const region = symbol === 'GEO-REGION.TEST';
  const components = symbol === 'GEO-MANY.TEST'
    ? [['Sverige', 24], ['Tyskland', 24], ['USA', 24], ['Danmark', 12], ['Norge', 12], ['Finland', 12], ['Kanada', 12]]
    : region ? [['Europa', 72], ['Nordamerika', 36], ['Asien', 12]]
      : [['Sverige', 48], ['Tyskland', 30], ['USA', 24], ['Norge', 18]];
  return {
    ...record, dimension: region ? 'region' : 'country', geographicBasis: 'customer_location',
    geographicBasisEvidence: { text: 'Fiktivt testunderlag: omsättningen fördelas efter kundernas geografiska placering.', pdfPage: 13 },
    source: { ...record.source, pdfPage: 13, printedPage: '13' },
    rows: [...components.map(([label, amount]) => [label, 'geography', amount]), ['Group', 'group', 120]]
      .map(([label, role, amount]) => ({ label, role, revenue: amount * 1e6, evidence: { cellText: String(amount), pdfPage: 13 } })),
  };
}
