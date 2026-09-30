// Fictional local-only valuation examples; not company research.
export function valuationFixture(symbol = 'VALUE.TEST', now = Date.now()) {
  const asOf = new Date(now).toISOString().slice(0, 10);
  const year = new Date(now).getUTCFullYear();
  const financials = { symbol, currency: 'SEK', source: 'issuer_report', annual: [year - 3, year - 2, year - 1].map((y, i) => ({
    fiscalPeriod: String(y), fiscalYear: y, frequency: 'annual', periodEnd: `${y}-12-31`,
    currency: 'SEK', revenue: 800e6 + i * 100e6, ebit: 95e6 + i * 15e6, dilutedEps: 3.8 + i * .6,
    netIncome: 190e6 + i * 30e6, sharesOutstanding: 50e6, source: 'issuer_report', sourceUrl: 'https://example.test/fictional-report.pdf',
  })), quarterly: Array.from({ length: 8 }, (_, i) => {
    const y = year - 2 + Math.floor((i + 2) / 4), q = (i + 2) % 4 + 1;
    return { fiscalPeriod: `${y}-Q${q}`, fiscalYear: y, fiscalQuarter: q, frequency: 'quarterly', periodEnd: `${y}-${String(q * 3).padStart(2, '0')}-28`,
      currency: 'SEK', revenue: 220e6 + i * 10e6, ebit: 28e6 + i * 2e6, dilutedEps: 1 + i * .06, source: 'issuer_report' };
  }), ttm: [], latestReport: { fiscalPeriod: `${year}-Q2` } };
  const snapshot = (fiscalPeriod, metrics) => ({ fiscalPeriod, snapshotId: fiscalPeriod, publishedAt: new Date(now - 86400_000).toISOString(),
    companies: [{ symbol }], source: { name: 'fixture-consensus', publisher: 'Fiktivt konsensus', url: 'https://example.test/fictional-estimate' }, contributors: 5,
    metrics: Object.entries(metrics).map(([key, amount]) => ({ key, amount, currency: 'SEK', unit: key.startsWith('eps') ? 'SEK' : 'MSEK' })) });
  const annual = symbol === 'VALUE-ANNUAL.TEST';
  const estimates = { symbol, snapshots: annual ? [snapshot(String(year), { revenue: 1100e6, ebit: 148e6, eps_diluted: 5.8 }), snapshot(String(year + 1), { revenue: 1230e6, ebit: 172e6, eps_diluted: 6.4 })]
    : [snapshot(`${year}-Q3`, { revenue: 310e6, eps_diluted: 1.52 })], models: [{ symbol, fiscalPeriod: `${year}-Q3`, origin: 'model', publicModelVersion: 1,
      currency: 'SEK', basis: 'reported', locked: false, updatedAt: new Date(now).toISOString(),
      metrics: { revenue: 300e6, ebit: 44e6 }, inputPeriods: financials.quarterly,
      method: { basis: 'median_yoy_growth_x_blended_margin' } }] };
  if (symbol === 'VALUE-MODEL-ANNUAL.TEST') estimates.models.push(...[year + 1, year + 2].map(y => ({
    symbol, fiscalPeriod: `${y}-FY`, origin: 'annual_model', publicAnnualModelVersion: 1,
    modelVersion: 'annual_hybrid_v1_pilot', currency: 'SEK', basis: 'reported', locked: false,
    updatedAt: new Date(now).toISOString(), inputPeriods: financials.quarterly, annualInputs: financials.annual,
    metrics: { revenue: y === year + 1 ? 1200e6 : 1300e6, ebit: 150e6 },
    metricStatus: { revenue: 'ready_for_review', ebit: 'ready_for_review', ebitda: 'needs_review' },
    reviewFlags: [{ code: 'annual_quarter_profit_mismatch', metric: 'ebitda' }],
    method: { weightsCalibrated: false },
  })));
  const multiples = [['pe', 'P/E', 20, 17.5, 15, 21], ['evEbit', 'EV/EBIT', 41.6, 38, 31, 44], ['ps', 'P/S', 5, 4.4, 3.8, 5.2], ['evSales', 'EV/S', 5.2, 4.6, 3.9, 5.4]]
    .map(([id, label, current, median, p25, p75]) => ({ id, label, available: true, reliable: true, stats: { current, median, p25, p75, min: p25 - 2, max: p75 + 3, count: 740 }, displayMax: p75 + 4,
      from: new Date(now - 129 * 7 * 86400_000).toISOString().slice(0, 10), to: asOf, series: Array.from({ length: 130 }, (_, i) => ({ date: new Date(now - (129 - i) * 7 * 86400_000).toISOString().slice(0, 10), value: i === 129 ? current : median + Math.sin(i / 7) * (p75 - median) + Math.sin(i / 2) * .4 })) }));
  const result = { financials, estimates, valuation: { symbol, asOf, latestClose: 100, reportingCurrency: 'SEK', tradingCurrency: 'SEK', currency: 'SEK', basis: 'annual_reported',
    method: { publicationLagDays: 90, notMeaningfulAbove: 200 }, multiples,
    capitalization: { currency: 'SEK', current: { asOf, basisPeriodEnd: `${year - 1}-12-31`, marketCap: 5000e6, enterpriseValue: 5200e6, netDebt: 200e6 } },
    periods: financials.annual.map(row => ({ ...row, eps: row.dilutedEps, effectiveFrom: `${row.fiscalYear + 1}-03-31`, netDebt: 200e6 })), rejectedPeriods: [] } };
  if (symbol.startsWith('VALUE-R12')) {
    for (const row of financials.quarterly) row.sharesOutstanding = 50e6;
    const quarters = financials.quarterly.slice(-4).map(q => ({ fiscalPeriod: q.fiscalPeriod, periodEnd: q.periodEnd,
      currency: q.currency, source: q.source, revenue: q.revenue, ebit: q.ebit, eps: q.dilutedEps, sharesOutstanding: q.sharesOutstanding }));
    const window = { ...quarters.at(-1), fiscalPeriod: quarters.at(-1).fiscalPeriod, quarters, epsBasis: 'dilutedEps',
      revenue: quarters.reduce((v, q) => v + q.revenue, 0), ebit: quarters.reduce((v, q) => v + q.ebit, 0),
      eps: quarters.reduce((v, q) => v + q.eps, 0), netDebt: 200e6, effectiveFrom: `${year}-08-27` };
    result.valuation.r12 = { ...structuredClone(result.valuation), schemaVersion: 1, basis: 'r12_reported',
      epsBasis: 'dilutedEps', currentWindow: window, periods: [window],
      capitalization: { currency: 'SEK', current: { ...result.valuation.capitalization.current, basisPeriodEnd: window.periodEnd } },
      multiples: multiples.map(m => {
        const denominator = m.id === 'pe' ? window.eps : m.id === 'evEbit' ? window.ebit : window.revenue;
        const current = (m.id === 'pe' ? 100 : m.id === 'ps' ? 5000e6 : 5200e6) / denominator;
        const series = m.series.slice(-25).map((p, i) => ({ ...p, value: current * (1 + Math.sin(i / 4) * .08) }));
        series.at(-1).value = current;
        return { ...m, series, from: series[0].date, stats: { ...m.stats, current, median: current, p25: current * .95, p75: current * 1.05 }, displayMax: current * 1.3 };
      }) };
  }
  return result;
}
