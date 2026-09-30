import test from 'node:test';
import assert from 'node:assert/strict';
import { valuationFixture } from './fixtures/valuation.mjs';
import { valuationForecasts, valuationChartData, valuationHistoryData } from '../app/utils/companyValuation.js';
import { estimateViews } from '../app/utils/companyResearchViews.js';
const now = Date.parse('2026-09-30T12:00:00Z'), symbol = 'VALUE.TEST';
function fixture() {
  const f = valuationFixture(symbol, now);
  f.estimates.models.push(...[2027, 2028].map(year => ({
    symbol, fiscalPeriod: `${year}-FY`, origin: 'annual_model', publicAnnualModelVersion: 1,
    modelVersion: 'annual_hybrid_v1_pilot', currency: 'SEK', basis: 'reported', locked: false,
    updatedAt: new Date(now).toISOString(), inputPeriods: f.financials.quarterly,
    annualInputs: f.financials.annual, method: { weightsCalibrated: false },
    metrics: { revenue: year === 2027 ? 1200e6 : 1300e6, ebit: 150e6 },
    metricStatus: { revenue: 'ready_for_review', ebit: 'ready_for_review' }, reviewFlags: [],
  })));
  return f;
}
test('annual models add two years without changing quarter forecast', () => {
  const f = fixture();
  const rows = valuationForecasts({ symbol, ...f, metric: 'revenue', currency: 'SEK', now });
  assert.deepEqual(rows.map(r => r.period.key), ['2026-Q3', '2027', '2028']);
  assert.equal(rows[0].value, 310e6); assert.equal(rows[1].annualModel, true);
});
test('flagged annual metric cannot enter chart, while other metric qualifies', () => {
  const f = fixture();
  for (const m of f.estimates.models.filter(m => m.origin === 'annual_model')) {
    m.reviewFlags = [{ code: 'annual_quarter_profit_mismatch', metric: 'ebit' }];
    m.metricStatus.ebit = 'needs_review';
  }
  assert.equal(valuationForecasts({ symbol, ...f, metric: 'ebit', currency: 'SEK', now }).length, 1);
  assert.equal(valuationForecasts({ symbol, ...f, metric: 'revenue', currency: 'SEK', now }).length, 3);
});
test('annual P/S year selector changes dotted endpoint; never manufactures EPS', () => {
  const f = fixture();
  for (const [period, value] of [['2027', 5000 / 1200], ['2028', 5000 / 1300]]) {
    const view = valuationChartData({ id: 'ps', symbol, ...f, availability: 'available', estimatePeriod: period, now });
    const chart = valuationHistoryData(f.valuation.multiples.find(m => m.id === 'ps'), view.historyForecasts);
    assert.equal(view.frequency, 'annual'); assert.equal(chart.reference.multiple.value, value);
    assert.equal(chart.reference.period.key, period);
  }
  assert.ok(valuationForecasts({ symbol, ...f, metric: 'eps', currency: 'SEK', now }).every(r => r.period.frequency === 'quarterly'));
});
test('estimate overview defaults to annual and can explicitly retain quarterly', () => {
  const f = fixture();
  assert.equal(estimateViews({ symbol, ...f, now })[0].frequency, 'annual');
  assert.equal(estimateViews({ symbol, ...f, frequency: 'quarterly', now })[0].forecasts[0].period.key, '2026-Q3');
});
test('annual consensus wins per period/metric, including a loss', () => {
  const f = fixture();
  f.estimates.snapshots.push({ ...f.estimates.snapshots[0], fiscalPeriod: '2027-FY',
    metrics: [{ key: 'ebit', amount: -100, unit: 'SEK', currency: 'SEK' }] });
  const row = valuationForecasts({ symbol, ...f, metric: 'ebit', currency: 'SEK', now }).find(r => r.period.key === '2027');
  assert.equal(row.value, -100); assert.equal(row.source, 'consensus');
});
