// Fictional report excerpts for the local stock-page UI, never app imports.
export function fictionalProfileInsights(symbol = 'NORD.TEST') {
  return {
    symbol, status: 'available', kind: 'report_excerpts', fiscalPeriod: '2025-FY',
    verification: { method: 'reviewed_report_excerpts' },
    source: { title: 'Fiktiv årsrapport', url: 'https://example.test/fictional-report.pdf', pdfSha256: 'f'.repeat(64) },
    opportunities: [
      { text: 'Serviceavtalen ger återkommande intäkter.', pdfPage: 12 },
      { text: 'Efterfrågan på energieffektiva produkter ökar.', pdfPage: 12 },
    ],
    risks: [
      { text: 'Försäljningen är beroende av ett fåtal stora kunder.', pdfPage: 18 },
      { text: 'Högre råvarupriser kan pressa marginalerna.', pdfPage: 18 },
    ],
  };
}
