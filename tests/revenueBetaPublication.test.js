import test from 'node:test';
import assert from 'node:assert/strict';
import { valuationFixture } from './fixtures/valuation.mjs';
import { valuationForecasts, valuationChartData, valuationHistoryData } from '../app/utils/companyValuation.js';
import { estimateViews } from '../app/utils/companyResearchViews.js';
import { legacyModelPublicationHidden, REVENUE_BETA_LABEL, REVENUE_BETA_MODEL_VERSION, REVENUE_BETA_METHOD, REVENUE_BETA_UNCERTAINTY } from '../app/utils/revenueBeta.js';

const now = Date.parse('2026-10-02T12:00:00Z');
function fixture(symbol = 'VALUE-R12.TEST') {
  const f = valuationFixture(symbol, now);
  const inputPeriods = f.financials.quarterly.map(q => ({ fiscalPeriod: q.fiscalPeriod,
    rank: q.fiscalYear * 4 + q.fiscalQuarter, periodEnd: q.periodEnd,
    currency: q.currency, source: q.source, revenue: q.revenue }));
  f.estimates.snapshots = [];
  f.estimates.revenueBetaModels = [{ symbol, origin: 'revenue_beta', modelVersion: REVENUE_BETA_MODEL_VERSION,
    releaseStage: 'beta', fiscalPeriod: '2026-Q3', fiscalYear: 2026, fiscalQuarter: 3,
    frequency: 'quarterly', currency: 'SEK', basis: 'reported', locked: false,
    updatedAt: new Date(now).toISOString(), metrics: { revenue: 275e6 }, inputPeriods,
    method: { basis: 'recent_four_median', newsAdjustmentApplied: false } }];
  return { ...f, symbol, metric: 'revenue', currency: 'SEK', availability: 'available', now };
}

test('revenue beta wins over legacy revenue, remains labeled and never mutates input', () => {
  const f = fixture(), before = structuredClone(f);
  const row = valuationForecasts(f)[0];
  assert.equal(row.value, 275e6);
  assert.equal(row.source, 'model');
  assert.equal(row.sourceLabel, REVENUE_BETA_LABEL);
  assert.equal(row.revenueBeta, true);
  assert.equal(row.releaseStage, 'beta');
  assert.equal(row.modelVersion, REVENUE_BETA_MODEL_VERSION);
  assert.deepEqual(row.method, { basis: 'recent_four_median', newsAdjustmentApplied: false });
  assert.deepEqual(f, before);
});

test('consensus still wins per revenue period, including zero and negative values', () => {
  for (const amount of [0, -1, 310e6]) {
    const f = fixture();
    f.estimates.snapshots = [{ fiscalPeriod: '2026-Q3', publishedAt: new Date(now).toISOString(),
      companies: [{ symbol: f.symbol }], source: { name: 'qualified_consensus' },
      metrics: [{ key: 'revenue', amount, currency: 'SEK', unit: 'SEK', basis: 'reported' }] }];
    const row = valuationForecasts(f)[0];
    assert.equal(row.source, 'consensus');
    assert.equal(row.value, amount);
    assert.equal(row.revenueBeta, undefined);
    assert.equal(row.sourceLabel, 'Konsensus');
  }
});

test('revenue beta cannot supply EBIT, EPS or annual values, or accept Terminal manual estimates', () => {
  const f = fixture();
  const ordinaryEbit = valuationForecasts({ ...f, metric: 'ebit' });
  assert.equal(ordinaryEbit[0].value, 44e6);
  assert.equal(ordinaryEbit[0].revenueBeta, undefined);
  assert.deepEqual(valuationForecasts({ ...f, metric: 'eps' }), []);
  f.estimates.models.push({ ...f.estimates.models[0], fiscalPeriod: '2027-FY', origin: 'annual_model',
    publicAnnualModelVersion: 1, modelVersion: 'annual_hybrid_v1_pilot', annualInputs: f.financials.annual,
    method: { weightsCalibrated: false }, metricStatus: { revenue: 'ready_for_review' }, reviewFlags: [] });
  const rows = valuationForecasts(f);
  assert.deepEqual(rows.map(q => [q.period.frequency, q.revenueBeta]), [['quarterly', true], ['annual', undefined]]);
  f.estimates.models = [];
  f.estimates.revenueBetaModels[0].origin = 'manual';
  assert.deepEqual(valuationForecasts(f), []);
});

test('only the explicitly separate public beta array is accepted', () => {
  const f = fixture();
  f.estimates.models = f.estimates.revenueBetaModels;
  delete f.estimates.revenueBetaModels;
  assert.deepEqual(valuationForecasts(f), []);
});

const invalidChanges = [
  ['wrong origin', m => { m.origin = 'model'; }],
  ['wrong version', m => { m.modelVersion = 'future_v2'; }],
  ['missing Beta stage', m => { delete m.releaseStage; }],
  ['wrong symbol', m => { m.symbol = 'OTHER.TEST'; }],
  ['wrong currency', m => { m.currency = 'EUR'; }],
  ['adjusted basis', m => { m.basis = 'adjusted'; }],
  ['locked target', m => { m.locked = true; }],
  ['missing explicit unlocked state', m => { delete m.locked; }],
  ['stale generation', m => { m.updatedAt = '2026-08-01'; }],
  ['future generation', m => { m.updatedAt = '2026-10-02T13:00:00Z'; }],
  ['unknown method', m => { m.method.basis = 'yoy_growth'; }],
  ['unqualified news adjustment', m => { m.method.newsAdjustmentApplied = true; }],
  ['missing adjustment state', m => { delete m.method.newsAdjustmentApplied; }],
  ['wrong year', m => { m.fiscalYear = 2027; }],
  ['wrong fiscal quarter', m => { m.fiscalQuarter = 2; }],
  ['annual model', m => { m.fiscalPeriod = '2027-FY'; m.frequency = 'annual'; }],
  ['second next quarter', m => { m.fiscalPeriod = '2026-Q4'; m.fiscalQuarter = 4; }],
  ['missing frequency', m => { delete m.frequency; }],
  ['null revenue', m => { m.metrics.revenue = null; }],
  ['zero revenue', m => { m.metrics.revenue = 0; }],
  ['negative revenue', m => { m.metrics.revenue = -1; }],
  ['infinite revenue', m => { m.metrics.revenue = Infinity; }],
  ['unexpected profit field', m => { m.metrics.ebit = 1; }],
  ['short history', m => { m.inputPeriods = m.inputPeriods.slice(-6); }],
  ['long history', m => { m.inputPeriods.unshift(m.inputPeriods[0]); }],
  ['revised revenue', m => { m.inputPeriods.at(-1).revenue += 1; }],
  ['revised report end', m => { m.inputPeriods.at(-1).periodEnd = '2026-06-30'; }],
  ['mixed source', m => { m.inputPeriods.at(-1).source = 'other_provider'; }],
  ['wrong input period', m => { m.inputPeriods.at(-1).fiscalPeriod = '2026-Q1'; }],
  ['wrong input rank', m => { m.inputPeriods.at(-1).rank -= 1; }],
  ['mixed input currency', m => { m.inputPeriods.at(-1).currency = 'EUR'; }],
  ['missing actual', (m, f) => { f.financials.quarterly.splice(-2, 1); }],
  ['adjusted actual', (m, f) => { f.financials.quarterly.at(-1).basis = 'adjusted'; }],
  ['YTD actual', (m, f) => { f.financials.quarterly.at(-1).frequency = 'ytd'; }],
  ['reported target', (m, f) => { f.financials.latestReport.fiscalPeriod = '2026-Q3'; }],
];
for (const [description, mutate] of invalidChanges) test(`beta rejects ${description} and retains legacy fallback`, () => {
  const f = fixture(); mutate(f.estimates.revenueBetaModels[0], f);
  const rows = valuationForecasts(f);
  assert.ok(rows.every(row => !row.revenueBeta));
  if (description === 'reported target') assert.deepEqual(rows, []);
});

test('qualified seven-quarter beta is supported without fabricating an eighth', () => {
  const f = fixture(); f.estimates.revenueBetaModels[0].inputPeriods.shift();
  assert.equal(valuationForecasts(f)[0].revenueBeta, true);
});

test('upstream failure and cross-company responses never display beta as a fallback', () => {
  const f = fixture();
  assert.deepEqual(valuationForecasts({ ...f, availability: 'unavailable' }), []);
  assert.deepEqual(valuationForecasts({ ...f, symbol: 'OTHER.TEST' }), []);
});

test('duplicate beta target selection is explicitly newest-first without changing array order', () => {
  const f = fixture(), old = structuredClone(f.estimates.revenueBetaModels[0]);
  old.updatedAt = '2026-10-01T12:00:00Z'; old.metrics.revenue = 270e6;
  f.estimates.revenueBetaModels.unshift(old, { ...old, updatedAt: 'bad' }, null);
  const before = structuredClone(f.estimates.revenueBetaModels);
  assert.equal(valuationForecasts(f)[0].value, 275e6);
  assert.deepEqual(f.estimates.revenueBetaModels, before);
});

test('beta metadata and label reach estimate bars, R12E and its dotted reference, not history', () => {
  const f = fixture(), before = structuredClone(f.valuation);
  const view = estimateViews(f).find(view => view.metric === 'revenue');
  assert.equal(view.forecasts[0].sourceLabel, REVENUE_BETA_LABEL);
  assert.equal(view.bars.at(-1).revenueBeta, true);
  assert.equal(view.bars.at(-2).source, 'reported');
  assert.equal(view.bars.at(-2).revenueBeta, undefined);
  for (const id of ['ps', 'evSales']) {
    const chart = valuationChartData({ ...f, id });
    assert.equal(chart.r12.revenueBeta, true);
    assert.equal(chart.r12.sourceLabel, REVENUE_BETA_LABEL);
    assert.equal(chart.r12.value, f.valuation.r12.currentWindow.quarters.slice(1).reduce((sum, q) => sum + q.revenue, 0) + 275e6);
    const history = valuationHistoryData(chart.historyValuation.multiples.find(m => m.id === id), chart.historyForecasts);
    assert.equal(history.reference.sourceLabel, REVENUE_BETA_LABEL);
    assert.equal(history.chartData.at(-1).forecast.revenueBeta, true);
  }
  assert.deepEqual(f.valuation, before);
});

test('Beta explanation describes the actual median model, not demonstrated accuracy or news adjustment', () => {
  assert.match(REVENUE_BETA_UNCERTAINTY, /Preliminär omsättningsprognos/);
  assert.match(REVENUE_BETA_METHOD, /medianen av de fyra/);
  assert.match(REVENUE_BETA_METHOD, /Nyheter justerar ännu inte beloppet/);
  assert.match(REVENUE_BETA_METHOD, /ännu inte validerad/);
});

test('retired quarterly revenue cannot return when beta is disabled, empty, or unqualified', () => {
  for (const mutate of [f => { delete f.estimates.revenueBetaModels; }, f => { f.estimates.revenueBetaModels = []; },
    f => { f.estimates.revenueBetaModels[0].metrics.revenue = null; }]) {
    const f = fixture(); mutate(f);
    f.estimates.modelPublicationPolicy = { version: 1, legacyModels: 'hide_quarterly_revenue' };
    assert.deepEqual(valuationForecasts(f), []);
    assert.equal(valuationForecasts({ ...f, metric: 'ebit' })[0].value, 44e6);
    assert.deepEqual(valuationChartData({ ...f, id: 'ps' }).forecasts, []);
    assert.equal(valuationChartData({ ...f, id: 'ps' }).r12, null);
    assert.ok(valuationChartData({ ...f, id: 'ps' }).bars.every(row => row.source === 'reported'));
  }
});

test('scoped retirement preserves old annual revenue and profit estimates', () => {
  const f = fixture(); delete f.estimates.revenueBetaModels;
  f.estimates.modelPublicationPolicy = { version: 1, legacyModels: 'hide_quarterly_revenue' };
  f.estimates.models.push({ ...f.estimates.models[0], fiscalPeriod: '2027-FY', origin: 'annual_model',
    publicAnnualModelVersion: 1, modelVersion: 'annual_hybrid_v1_pilot', annualInputs: f.financials.annual,
    method: { weightsCalibrated: false }, metricStatus: { revenue: 'ready_for_review', ebit: 'ready_for_review' }, reviewFlags: [] });
  assert.deepEqual(valuationForecasts(f).map(row => row.period.key), ['2027']);
  assert.deepEqual(valuationForecasts({ ...f, metric: 'ebit' }).map(row => row.period.key), ['2026-Q3', '2027']);
});

test('all-model retirement removes old quarterly/annual values but keeps beta, consensus and actuals', () => {
  const f = fixture();
  f.estimates.modelPublicationPolicy = { version: 1, legacyModels: 'hide_all' };
  f.estimates.models.push({ ...f.estimates.models[0], fiscalPeriod: '2027-FY', origin: 'annual_model',
    publicAnnualModelVersion: 1, modelVersion: 'annual_hybrid_v1_pilot', annualInputs: f.financials.annual,
    method: { weightsCalibrated: false }, metricStatus: { revenue: 'ready_for_review', ebit: 'ready_for_review' }, reviewFlags: [] });
  assert.deepEqual(valuationForecasts(f).map(row => [row.period.key, row.revenueBeta]), [['2026-Q3', true]]);
  assert.deepEqual(valuationForecasts({ ...f, metric: 'ebit' }), []);
  const before = structuredClone(f.financials);
  f.estimates.snapshots = [{ fiscalPeriod: '2027-FY', publishedAt: new Date(now).toISOString(),
    companies: [{ symbol: f.symbol }], source: { name: 'consensus' },
    metrics: [{ key: 'ebit', amount: -1, currency: 'SEK' }] }];
  assert.equal(valuationForecasts({ ...f, metric: 'ebit' })[0].value, -1);
  delete f.estimates.revenueBetaModels;
  assert.deepEqual(valuationForecasts(f), []);
  assert.deepEqual(f.financials, before);
});

test('publication policy is an explicit versioned instruction, not inferred from beta coverage', () => {
  for (const policy of [undefined, null, {}, { version: 1, legacyModels: 'legacy' },
    { version: 2, legacyModels: 'hide_all' }, { version: 1, legacyModels: 'unknown' }]) {
    assert.equal(legacyModelPublicationHidden(policy, 'revenue', 'quarterly'), false);
  }
  assert.equal(legacyModelPublicationHidden({ version: 1, legacyModels: 'hide_quarterly_revenue' }, 'revenue', 'quarterly'), true);
  assert.equal(legacyModelPublicationHidden({ version: 1, legacyModels: 'hide_quarterly_revenue' }, 'revenue', 'annual'), false);
  assert.equal(legacyModelPublicationHidden({ version: 1, legacyModels: 'hide_all' }, 'eps', 'annual'), true);
});
