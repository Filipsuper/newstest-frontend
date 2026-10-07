// Dated marketing examples, not a live ranking or investment recommendation.
// Public observations verified on 2026-10-03:
// https://omxsum.com/api/feed/screener-preview (Yahoo, reported FY 2025)
// https://omxsum.com/api/feed/company-profiles?symbols=SAAB-B.ST,ATCO-A.ST,ERIC-B.ST
// Never substitute these historic scores for missing data in the actual product.
export const LANDING_SCREENER_EXAMPLE = {
  capturedAt: '2026-10-03', periodEnd: '2025-12-31',
  filter: { metric: 'ebitMarginPct', minimumExclusive: 10, label: 'EBIT-marginal över 10 %' },
  items: [
    { symbol: 'ATCO-A.ST', name: 'Atlas Copco A', sector: 'Industri',
      value: 20.525355969657188,
      profile: { version: 2, coveragePct: 100, axes: [
        { key: 'value', score: 0 }, { key: 'growth', score: 1 },
        { key: 'past', score: 5 }, { key: 'health', score: 4 },
        { key: 'insiders', score: 1 }, { key: 'dividend', score: 4 },
      ] } },
    { symbol: 'ERIC-B.ST', name: 'Ericsson B', sector: 'Telekom',
      value: 17.331767230998686,
      profile: { version: 2, coveragePct: 96, axes: [
        { key: 'value', score: 4 }, { key: 'growth', score: 1 },
        { key: 'past', score: 4 }, { key: 'health', score: 5 },
        { key: 'insiders', score: 3 }, { key: 'dividend', score: 5 },
      ] } },
    { symbol: 'SAAB-B.ST', name: 'SAAB B', sector: 'Försvar',
      value: 10.852096126146616,
      profile: { version: 2, coveragePct: 100, axes: [
        { key: 'value', score: 0 }, { key: 'growth', score: 5 },
        { key: 'past', score: 5 }, { key: 'health', score: 4 },
        { key: 'insiders', score: 1 }, { key: 'dividend', score: 4 },
      ] } },
  ],
};
