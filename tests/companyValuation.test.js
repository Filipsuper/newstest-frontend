import test from 'node:test';
import assert from 'node:assert/strict';
import { valuationChartData, valuationForecasts, forwardMultiple, valuationHistoryData } from '../app/utils/companyValuation.js';
import { valuationFixture } from './fixtures/valuation.mjs';

const now = Date.parse('2026-09-25T12:00:00Z');
test('explicit annual year selection updates only the reference, preserving actuals and all forecast bars', () => {
  const value = args('VALUE-ANNUAL.TEST');
  const before = structuredClone(value);
  for (const id of ['pe', 'ps', 'evEbit', 'evSales']) {
    const initial = valuationChartData({ ...value, id });
    const selected = valuationChartData({ ...value, id, estimatePeriod: '2027' });
    assert.equal(initial.selectedForecast.period.key, '2026');
    assert.equal(selected.selectedForecast.period.key, '2027');
    assert.deepEqual(selected.bars, initial.bars);
    assert.deepEqual(selected.forecasts, initial.forecasts);
    const chart = valuationHistoryData(selected.historyValuation.multiples.find(m => m.id === id), selected.historyForecasts);
    assert.equal(chart.reference.period.key, '2027');
    assert.equal(chart.reference.multiple.value, selected.forecasts[1].multiple.value);
    assert.deepEqual(selected.historyValuation, initial.historyValuation);
  }
  assert.deepEqual(value, before);
});
test('an unavailable or removed estimate year falls back to the nearest actual qualified period', () => {
  const value = args('VALUE-ANNUAL.TEST');
  const options = { ...value, id: 'pe', estimatePeriod: '2027' };
  value.estimates.snapshots[1].metrics = value.estimates.snapshots[1].metrics.filter(m => m.key !== 'eps_diluted');
  assert.equal(valuationChartData(options).selectedForecast.period.key, '2026');
  assert.equal(valuationChartData({ ...options, estimatePeriod: '2099' }).selectedForecast.period.key, '2026');
  assert.equal(valuationChartData({ ...options, availability: 'unavailable' }).selectedForecast, null);
});
test('a selected loss year keeps its selection without substituting another annual reference', () => {
  const value = args('VALUE-ANNUAL.TEST');
  value.estimates.snapshots[1].metrics.find(m => m.key === 'eps_diluted').amount = -1;
  const selected = valuationChartData({ ...value, id: 'pe', estimatePeriod: '2027' });
  assert.equal(selected.selectedForecast.period.key, '2027');
  assert.equal(selected.selectedForecast.multiple.reason, 'not_meaningful');
  assert.equal(valuationHistoryData(value.valuation.multiples[0], selected.historyForecasts).reference, null);
  assert.ok(valuationHistoryData(value.valuation.multiples[0], valuationChartData({ ...value, id: 'pe' }).historyForecasts).reference);
});
test('annual selection never replaces or annualises a quarterly R12E', () => {
  const f = valuationFixture('VALUE-R12.TEST', now);
  const options = { ...f, id: 'ps', symbol: f.financials.symbol, availability: 'available', now };
  const initial = valuationChartData(options);
  const selected = valuationChartData({ ...options, estimatePeriod: '2027' });
  assert.equal(selected.selectedForecast, null);
  assert.deepEqual(selected.r12, initial.r12);
  assert.deepEqual(selected.historyForecasts, initial.historyForecasts);
});
test('explicit EPS model extension is allowed only on its matching current financial inputs', () => {
  const f = valuationFixture('VALUE-R12.TEST', now);
  f.estimates.snapshots = [];
  const model = f.estimates.models[0];
  model.epsEstimate = { version: 1, unavailableReason: null, method: 'common_profit_blended_margin_at_unchanged_shares',
    inputs: f.financials.quarterly.slice(-4).map(q => ({ ...q })), forecasts: { dilutedEps: { value: 1.4, basis: 'diluted' } } };
  const options = { ...f, id: 'pe', symbol: f.financials.symbol, availability: 'available', now };
  assert.equal(valuationChartData(options).r12.source, 'model');
  model.epsEstimate.inputs[0].basicAverageShares = 123;
  assert.equal(valuationChartData(options).r12, null);
  delete model.epsEstimate.inputs[0].basicAverageShares;
  model.epsEstimate.forecasts.dilutedEps.basis = 'basic';
  assert.equal(valuationChartData(options).r12, null);
});
test('R12E rolls the window forward using three actual quarters plus the next estimate', () => {
  const f = valuationFixture('VALUE-R12.TEST', now);
  const before = structuredClone(f);
  for (const id of ['pe', 'ps', 'evEbit', 'evSales']) {
    const model = valuationChartData({ ...f, id, symbol: f.financials.symbol, availability: 'available', now });
    assert.equal(model.r12.basis, 'r12_estimated');
    assert.equal(model.historyValuation.basis, 'r12_reported');
    const metric = id === 'pe' ? 'eps' : id === 'evEbit' ? 'ebit' : 'revenue';
    const sum = f.valuation.r12.currentWindow.quarters.slice(1).reduce((v, q) => v + q[metric], 0);
    assert.equal(model.r12.value, sum + model.r12.quarterEstimate);
    assert.notEqual(model.r12.value, model.r12.quarterEstimate * 4);
    const history = valuationHistoryData(model.historyValuation.multiples.find(m => m.id === id), model.historyForecasts);
    assert.equal(history.reference.displayLabel, 'R12E');
    assert.equal(history.chartData.at(-1).date, undefined);
  }
  assert.deepEqual(f, before);
});
test('R12E withholds mismatched revisions, missing quarters and unsafe EPS share basis', () => {
  for (const mutate of [f => f.financials.quarterly.at(-1).revenue += 1,
    f => f.financials.quarterly.at(-1).currency = 'EUR', f => f.financials.quarterly.splice(-2, 1),
    f => f.valuation.r12.currentWindow = null, f => f.valuation.r12.currentWindow.quarters.at(-1).sharesOutstanding += 1,
    f => f.valuation.r12.multiples.find(m => m.id === 'ps').series.at(-1).value = null]) {
    const f = valuationFixture('VALUE-R12.TEST', now); mutate(f);
    const model = valuationChartData({ ...f, id: 'ps', symbol: f.financials.symbol, availability: 'available', now });
    assert.equal(model.r12, null); assert.equal(model.historyValuation.basis, 'annual_reported');
  }
  const f = valuationFixture('VALUE-R12.TEST', now);
  f.valuation.r12.currentWindow.epsUnavailableReason = 'share_basis_requires_review';
  assert.equal(valuationChartData({ ...f, id: 'pe', symbol: f.financials.symbol, availability: 'available', now }).r12, null);
});
test('R12E respects next-quarter consensus loss, stale prices and exact explicit EPS basis', () => {
  const f = valuationFixture('VALUE-R12.TEST', now);
  f.estimates.snapshots[0].metrics.find(m => m.key === 'revenue').amount = -1e10;
  const m = valuationChartData({ ...f, id: 'ps', symbol: f.financials.symbol, availability: 'available', now });
  assert.equal(m.r12.source, 'consensus'); assert.equal(m.r12.multiple.reason, 'not_meaningful');
  assert.equal(valuationHistoryData(m.historyValuation.multiples[0], m.historyForecasts).reference, null);
  f.valuation.r12.asOf = '2025-01-01';
  assert.equal(valuationChartData({ ...f, id: 'ps', symbol: f.financials.symbol, availability: 'available', now }).r12, null);
  f.valuation.r12.asOf = f.valuation.asOf;
  f.estimates.snapshots[0].metrics.find(m => m.key === 'eps_diluted').key = 'eps';
  assert.equal(valuationChartData({ ...f, id: 'pe', symbol: f.financials.symbol, availability: 'available', now }).r12, null);
});
test('estimate reference uses the nearest annual multiple without changing historical values or statistics', () => {
  const value = args('VALUE-ANNUAL.TEST');
  for (const id of ['pe', 'ps', 'evEbit', 'evSales']) {
    const model = valuationChartData({ ...value, id });
    const multiple = value.valuation.multiples.find(row => row.id === id);
    const before = structuredClone(multiple);
    const chart = valuationHistoryData(multiple, model.forecasts);
    assert.equal(chart.reference, model.forecasts[0]);
    assert.ok(chart.displayMax > chart.reference.multiple.value);
    const last = chart.series.at(-1), endpoint = chart.chartData.at(-1);
    assert.equal(chart.chartData.at(-2).estimated, last.value);
    assert.equal(endpoint.estimated, model.forecasts[0].multiple.value);
    assert.equal(endpoint.date, undefined);
    assert.equal(endpoint.plotted, null);
    assert.ok(Math.abs((endpoint.time - last.time) / (endpoint.time - chart.series[0].time) - .1) < .000001);
    assert.deepEqual(chart.series.map(({ time, plotted, ...row }) => row), multiple.series);
    assert.deepEqual(multiple, before);
  }
});
test('estimate reference never annualises a quarter, skips a loss, or displays an invalid multiple', () => {
  const quarterly = valuationChartData({ ...args(), id: 'ps' });
  assert.equal(valuationHistoryData({}, quarterly.forecasts).reference, null);
  const value = args('VALUE-ANNUAL.TEST');
  for (const multiple of [{ value: null, reason: 'currency' }, { value: 0, reason: null }, { value: -2, reason: null }, { value: NaN, reason: null }, { value: Infinity, reason: null }]) {
    const model = valuationChartData({ ...value, id: 'pe' });
    model.forecasts[0].multiple = multiple;
    assert.equal(valuationHistoryData(value.valuation.multiples[0], model.forecasts).reference, null);
  }
  const stale = valuationChartData({ ...value, id: 'pe', valuation: { ...value.valuation, asOf: '2025-01-01' } });
  assert.equal(valuationHistoryData({}, stale.forecasts).reference, null);
});
test('an estimate outside the historical display limit is visible without resurrecting clipped observations', () => {
  const multiple = { displayMax: 10, series: [{ date: '2026-09-24', value: 99 }, { date: '2026-09-25', value: 5 }] };
  const reference = { period: { frequency: 'annual' }, multiple: { value: 30, reason: null } };
  const chart = valuationHistoryData(multiple, [reference]);
  assert.ok(chart.displayMax > 30);
  assert.equal(chart.series[0].plotted, null);
  assert.equal(chart.series[1].plotted, 5);
  assert.equal(valuationHistoryData(multiple).displayMax, 10);
});
test('a missing or clipped historical endpoint never gets a fabricated estimate connector', () => {
  const reference = { period: { frequency: 'annual' }, multiple: { value: 30, reason: null } };
  for (const value of [null, 99]) {
    const multiple = { displayMax: 10, series: [{ date: '2026-09-24', value: 5 }, { date: '2026-09-25', value }] };
    const chart = valuationHistoryData(multiple, [reference]);
    assert.equal(chart.reference, null);
    assert.equal(chart.chartData.length, 2);
    assert.equal(chart.estimateEnd, null);
  }
});
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
  const value = args();
  // A separate, complete operating-income series qualifies the profit model;
  // the absent historical EBIT must still be displayed as missing.
  for (const q of value.financials.quarterly) q.operatingIncome = q.ebit;
  value.financials.quarterly.at(-1).ebit = null;
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
