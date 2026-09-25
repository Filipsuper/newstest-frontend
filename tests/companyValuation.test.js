import test from 'node:test';
import assert from 'node:assert/strict';
import { valuationChartData, valuationForecasts, forwardMultiple } from '../app/utils/companyValuation.js';
import { valuationFixture } from './fixtures/valuation.mjs';

const now = Date.parse('2026-09-25T12:00:00Z');
function args(symbol = 'VALUE.TEST') { const fixture = valuationFixture(symbol, now); return { symbol, ...fixture, availability: 'available', currency: 'SEK', metric: 'ebit', now }; }
test('metric-specific precedence uses consensus for revenue, model for EBIT, explicit EPS only', () => {
  const value = args();
  assert.equal(valuationForecasts(value)[0].source, 'model');
  assert.equal(valuationForecasts({ ...value, metric: 'revenue' })[0].value, 310e6);
  assert.equal(valuationForecasts({ ...value, metric: 'eps' })[0].value, 1.52);
  value.estimates.snapshots[0].metrics.find(row => row.key === 'eps_diluted').key = 'eps';
  assert.deepEqual(valuationForecasts({ ...value, metric: 'eps' }), []);
});
test('consensus zero and losses are valid, never replaced by positive model', () => {
  for (const amount of [-12e6, 0]) {
    const value = args(); value.estimates.snapshots[0].metrics.push({ key: 'ebit', currency: 'SEK', amount });
    const forecast = valuationForecasts(value)[0];
    assert.equal(forecast.source, 'consensus'); assert.equal(forecast.value, amount);
  }
});
test('request failure is not consensus absence; exact company and currency are mandatory', () => {
  const value = args();
  for (const changed of [{ availability: 'unavailable' }, { estimates: null }, { symbol: 'OTHER.TEST' }, { currency: 'EUR' }]) assert.deepEqual(valuationForecasts({ ...value, ...changed }), []);
});
test('model rejects manual, legacy, stale, locked, currency and basis mismatches', () => {
  for (const change of [{ origin: 'manual' }, { publicModelVersion: null }, { locked: true }, { currency: null }, { basis: 'adjusted' }, { updatedAt: '2025-01-01' }, { inputPeriods: [] }]) {
    const value = args(); Object.assign(value.estimates.models[0], change); assert.deepEqual(valuationForecasts(value), []);
  }
});
test('reported targets and stale consensus are withheld', () => {
  const value = args(); value.financials.latestReport.fiscalPeriod = '2026-Q3';
  assert.deepEqual(valuationForecasts(value), []);
  const stale = args(); stale.estimates.snapshots[0].publishedAt = '2025-01-01'; stale.estimates.models = [];
  assert.deepEqual(valuationForecasts({ ...stale, metric: 'revenue' }), []);
});
test('adjusted and scoped values do not masquerade as reported EBIT', () => {
  for (const changed of [{ scope: 'Region' }, { basis: 'adjusted' }, { label: 'Adjusted EBIT' }, { unit: '%' }, { amount: null }]) {
    const value = args(); value.estimates.models = [];
    value.estimates.snapshots[0].metrics = [{ key: 'ebit', currency: 'SEK', amount: 30e6, ...changed }];
    assert.deepEqual(valuationForecasts(value), []);
  }
});
test('quarterly chart stays quarterly: no multiplication by four and no historical mutation', () => {
  const value = args(), before = structuredClone(value.valuation);
  const chart = valuationChartData({ ...value, id: 'evEbit' });
  assert.equal(chart.frequency, 'quarterly'); assert.equal(chart.bars.length, 4);
  assert.equal(chart.forecasts[0].multiple.reason, 'quarterly');
  assert.deepEqual(value.valuation, before);
});
test('annual forecasts use dated capitalization and matching EPS basis', () => {
  const value = args('VALUE-ANNUAL.TEST');
  const chart = valuationChartData({ ...value, id: 'pe' });
  assert.equal(chart.frequency, 'annual'); assert.equal(chart.forecasts.length, 2);
  assert.equal(chart.forecasts[0].multiple.value, 100 / 5.8);
  assert.equal(valuationChartData({ ...value, id: 'evEbit' }).forecasts[0].multiple.value, 5200e6 / 148e6);
});
test('annual multiple withholds incomplete, zero, stale, unaligned or FX-missing assumptions', () => {
  const value = args('VALUE-ANNUAL.TEST'), forecast = valuationForecasts(value).find(row => row.period.frequency === 'annual');
  assert.equal(forwardMultiple('evEbit', { ...forecast, value: 0 }, value.valuation, now).reason, 'not_meaningful');
  assert.equal(forwardMultiple('evEbit', forecast, { ...value.valuation, asOf: '2025-01-01' }, now).reason, 'capitalization');
  assert.equal(forwardMultiple('evEbit', forecast, { ...value.valuation, tradingCurrency: 'EUR' }, now).reason, 'currency');
  value.valuation.capitalization.current.asOf = '2026-09-20';
  assert.equal(forwardMultiple('evEbit', forecast, value.valuation, now).reason, 'capitalization');
});
test('missing actuals stay null, not zero; future actuals are excluded', () => {
  const value = args(); value.financials.quarterly.at(-1).ebit = null;
  value.financials.quarterly.push({ ...value.financials.quarterly.at(-1), fiscalPeriod: '2026-Q3', estimate: true, ebit: 999e6 });
  const chart = valuationChartData({ ...value, id: 'evEbit' });
  assert.equal(chart.bars.at(-2).value, null); assert.equal(chart.forecasts[0].value, 44e6);
});

test('annual reported periods also suppress older quarter forecasts, and Q4 actuals suppress annual forecasts', () => {
  const value = args(); value.financials.latestReport.fiscalPeriod = '2026-FY';
  assert.deepEqual(valuationForecasts(value), []);
  const annual = args('VALUE-ANNUAL.TEST'); annual.financials.latestReport.fiscalPeriod = '2026-Q4';
  const forecasts = valuationForecasts(annual);
  assert.deepEqual(forecasts.map(row => row.period.key), ['2027']);
});

test('cross-currency annual forecasts use the capitalization-date FX rate, not mixed currencies', () => {
  const value = args('VALUE-ANNUAL.TEST'), forecast = valuationForecasts(value).find(row => row.period.frequency === 'annual');
  const valuation = { ...value.valuation, tradingCurrency: 'EUR', fx: { rateNow: .1 }, capitalization: { currency: 'EUR', current: { ...value.valuation.capitalization.current, enterpriseValue: 520e6 } } };
  assert.equal(forwardMultiple('evEbit', forecast, valuation, now).value, 520e6 / (148e6 * .1));
});
