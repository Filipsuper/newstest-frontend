import test from 'node:test';
import assert from 'node:assert/strict';
import { valuationForecasts, valuationChartData, valuationHistoryData } from '../app/utils/companyValuation.js';
import { estimateViews } from '../app/utils/companyResearchViews.js';
import { valuationFixture } from './fixtures/valuation.mjs';
const now = Date.parse('2026-09-30T12:00:00Z');
function fixture() {
  const f = valuationFixture('VALUE-R12.TEST', now), symbol = f.financials.symbol;
  f.estimates.snapshots = [];
  const q = f.estimates.models[0];
  q.metrics.ebitda = 50e6; q.metrics.netIncome = 20e6;
  q.epsEstimate = { version: 1, unavailableReason: null, method: 'common_profit_blended_margin_at_unchanged_shares',
    inputs: f.financials.quarterly.slice(-4).map(q => ({ ...q })),
    forecasts: { dilutedEps: { value: 1.4, basis: 'diluted' } } };
  f.estimates.models.push(...[2027, 2028].map(year => ({ ...q, fiscalPeriod: `${year}-FY`,
    origin: 'annual_model', publicAnnualModelVersion: 1, modelVersion: 'annual_hybrid_v1_pilot',
    annualInputs: f.financials.annual, method: { weightsCalibrated: false },
    metricStatus: { revenue: 'ready_for_review', ebit: 'ready_for_review', ebitda: 'ready_for_review', netIncome: 'ready_for_review' }, reviewFlags: [] })));
  return { ...f, symbol, now, availability: 'available' };
}
test('old cached model values cannot show profits for operating-loss companies at any frequency', () => {
  const f = fixture();
  for (const metric of ['ebit', 'ebitda', 'netIncome', 'eps']) assert.ok(valuationForecasts({ ...f, metric, currency: 'SEK' }).length);
  for (const q of f.financials.quarterly) q.operatingIncome = -10e6;
  const before = structuredClone(f);
  for (const metric of ['ebit', 'ebitda', 'netIncome', 'eps']) assert.deepEqual(valuationForecasts({ ...f, metric, currency: 'SEK' }), []);
  assert.equal(valuationForecasts({ ...f, metric: 'revenue', currency: 'SEK' }).length, 3);
  const views = estimateViews(f);
  assert.equal(views.find(view => view.metric === 'revenue').forecasts.length, 2);
  assert.deepEqual(views.find(view => view.metric === 'ebit').forecasts, []);
  assert.deepEqual(f, before);
});
test('model profit valuation endpoints vanish, but sales endpoints and actual curves remain', () => {
  const f = fixture();
  for (const q of f.financials.quarterly) q.operatingIncome = -10e6;
  for (const id of ['evEbit', 'pe']) {
    const view = valuationChartData({ ...f, id });
    assert.deepEqual(view.forecasts, []); assert.equal(view.r12, null);
    const multiple = view.historyValuation.multiples.find(m => m.id === id);
    const chart = valuationHistoryData(multiple, view.historyForecasts);
    assert.equal(chart.reference, null); assert.ok(chart.series.length);
    assert.deepEqual(view.historyValuation, f.valuation);
  }
  for (const id of ['ps', 'evSales']) {
    const view = valuationChartData({ ...f, id });
    const chart = valuationHistoryData(view.historyValuation.multiples.find(m => m.id === id), view.historyForecasts);
    assert.ok(chart.reference); assert.equal(chart.reference.period.key, '2027');
  }
});
test('consensus gains, losses and zero remain public despite a model operating-loss gate', () => {
  for (const amount of [-100, 0, 100]) {
    const f = fixture();
    for (const q of f.financials.quarterly) q.operatingIncome = -10e6;
    f.estimates.snapshots = ['2026-Q3', '2027-FY'].map(fiscalPeriod => ({ fiscalPeriod,
      companies: [{ symbol: f.symbol }], publishedAt: new Date(now).toISOString(),
      source: { name: 'qualified_consensus' }, metrics: ['ebit', 'netIncome', 'eps_diluted'].map(key => ({
        key, amount, currency: 'SEK', unit: 'SEK', basis: 'reported' })) }));
    for (const metric of ['ebit', 'netIncome', 'eps']) {
      const forecasts = valuationForecasts({ ...f, metric, currency: 'SEK' });
      assert.equal(forecasts.length, 2);
      assert.ok(forecasts.every(q => q.value === amount && q.source === 'consensus'));
    }
  }
});
test('incomplete operating history cannot borrow annual profit or mix quarterly definitions', () => {
  const f = fixture(); f.financials.quarterly.at(-1).operatingIncome = 10;
  f.financials.quarterly.at(-2).ebit = null;
  assert.deepEqual(valuationForecasts({ ...f, metric: 'ebit', currency: 'SEK' }), []);
  assert.equal(valuationForecasts({ ...f, metric: 'revenue', currency: 'SEK' }).length, 3);
});
test('server withholding metadata is respected even if local financial inputs differ', () => {
  const f = fixture();
  for (const m of f.estimates.models) m.profitEligibility = { version: 1, status: 'withheld_operating_loss' };
  assert.deepEqual(valuationForecasts({ ...f, metric: 'ebit', currency: 'SEK' }), []);
  assert.deepEqual(valuationForecasts({ ...f, metric: 'eps', currency: 'SEK' }), []);
  assert.equal(valuationForecasts({ ...f, metric: 'revenue', currency: 'SEK' }).length, 3);
});
