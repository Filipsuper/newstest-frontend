import test from 'node:test';
import assert from 'node:assert/strict';
import { chartModel, CHART_SOURCES, distributionModel, estimateChartModel } from '../app/utils/chartPresentation.js';
import { estimateViews } from '../app/utils/companyResearchViews.js';
import { valuationFixture } from './fixtures/valuation.mjs';

const series = [{ key: 'revenue', label: 'Omsättning', source: 'reported' }];
const row = (id, value, x = +id) => ({ id, x, label: id, values: { revenue: value } });
const input = rows => ({ rows, series, unit: { kind: 'money', currency: 'SEK' } });

test('normalization never changes its input or replaces missing values with zero', () => {
  const data = input([row('1', 0), row('2', null), row('3', undefined), row('4', '42'), row('5', -10), row('6', Infinity)]);
  const before = structuredClone(data);
  const model = chartModel(data);
  assert.equal(model.status, 'ready');
  assert.deepEqual(model.rows.map(r => r.values.revenue), [0, null, null, null, -10, null]);
  assert.deepEqual(model.plotted.map(r => r.revenue), [0, null, null, null, -10, null]);
  assert.deepEqual(data, before);
  assert.equal(model.format(null), 'Saknas');
  assert.equal(model.format(0), '0 SEK');
  assert.equal(model.format(-10), '−10 SEK');
});

test('time coordinates are preserved and sorted without adding missing dates', () => {
  const model = chartModel({ ...input([row('late', 3, 300), row('early', 1, 10), row('middle', null, 100)]), time: true });
  assert.deepEqual(model.rows.map(r => [r.id, r.x]), [['early', 10], ['middle', 100], ['late', 300]]);
  assert.equal(model.plotted[1].revenue, null);
});

test('bars include zero and preserve negative and zero observations', () => {
  const model = chartModel({ ...input([row('1', -30), row('2', 0), row('3', 50)]), zeroBaseline: true });
  assert.deepEqual(model.domain, [-30, 50]);
  assert.deepEqual(chartModel({ ...input([row('1', 50)]), zeroBaseline: true }).domain, [0, 50]);
  assert.deepEqual(chartModel({ ...input([row('1', 0)]), zeroBaseline: true }).domain, [0, 1]);
});

test('one unit scale is used for axes, tooltips and exact-value tables', () => {
  const model = chartModel(input([row('1', 2e6), row('2', -1e6)]));
  assert.equal(model.scale, 1e6);
  assert.equal(model.unitLabel, 'M SEK');
  assert.equal(model.plotted[0].revenue, 2);
  assert.equal(model.format(-1e6), '−1 M SEK');
  assert.equal(model.formatExact(1015000000), '1 015 000 000 SEK');
  assert.equal(model.formatExact(null), 'Saknas');
  assert.equal(model.formatExact(1.23456789), '1,23456789 SEK');
  assert.equal(model.tick(2), '2');
});

test('percent, multiples and per-share values are never millions-scaled', () => {
  for (const [unit, suffix] of [[{ kind: 'percent' }, '%'], [{ kind: 'multiple' }, '×'], [{ kind: 'perShare', currency: 'SEK' }, 'SEK/aktie']]) {
    const model = chartModel({ ...input([row('1', 2000)]), unit });
    assert.equal(model.scale, 1);
    assert.equal(model.unitLabel, suffix);
  }
});

test('malformed units, source types, colliding keys and duplicate periods fail closed', () => {
  const base = input([row('1', 3)]);
  for (const change of [
    { unit: { kind: 'money' } }, { unit: { kind: 'money', currency: 'sek' } }, { unit: { kind: 'unknown' } },
    { series: [{ ...series[0], source: 'manual' }] }, { series: [{ ...series[0], source: 'constructor' }] },
    { series: [{ ...series[0], key: 'values' }] }, { series: [{ ...series[0], key: '_single' }] },
    { series: [series[0], series[0]] }, { rows: [row('1', 2), row('1', 3)] },
    { rows: [row('1', 2, NaN)], time: true }, { rows: [row('1', 2, 1), row('2', 3, 1)], time: true },
  ]) assert.equal(chartModel({ ...base, ...change }).status, 'invalid');
});

test('all-missing and empty histories are empty, not fabricated series', () => {
  assert.equal(chartModel(input([])).status, 'empty');
  assert.equal(chartModel(input([row('1', null), row('2', NaN)])).status, 'empty');
});

test('estimate sources have separate colors and non-color line encodings', () => {
  const rows = [{ id: '2026', label: '2026E', values: { consensus: 100, model: 90 } }];
  const sourceSeries = ['consensus', 'model'].map(source => ({ key: source, source, label: CHART_SOURCES[source].label }));
  const model = chartModel({ rows, series: sourceSeries, unit: { kind: 'money', currency: 'SEK' } });
  assert.equal(model.series[0].color, 'var(--ui-chart-2)');
  assert.equal(model.series[1].color, 'var(--ui-chart-3)');
  const filtered = chartModel({ rows, series: [sourceSeries[1]], unit: { kind: 'money', currency: 'SEK' } });
  assert.equal(filtered.series[0].color, model.series[1].color);
  assert.notEqual(CHART_SOURCES.consensus.dash, CHART_SOURCES.model.dash);
  assert.deepEqual(model.rows[0].values, { consensus: 100, model: 90 });
});

test('the estimate adapter keeps the existing qualified source precedence and periods', () => {
  const now = Date.parse('2026-09-25T12:00:00Z'), symbol = 'VALUE.TEST';
  const fixture = valuationFixture(symbol, now);
  const views = estimateViews({ symbol, ...fixture, availability: 'available', now });
  for (const view of views) {
    const before = structuredClone(view);
    const chart = estimateChartModel(view);
    assert.deepEqual(chart.rows.map(r => r.id), view.bars.map(r => r.period.key));
    chart.rows.forEach((r, i) => assert.equal(r.values[view.bars[i].source], view.bars[i].value));
    assert.deepEqual(view, before);
    assert.equal(chartModel({ ...chart, zeroBaseline: true }).status, 'ready');
  }
  assert.equal(estimateChartModel(views[0]).series.at(-1).source, 'consensus');
  assert.equal(estimateChartModel(views[1]).series.at(-1).source, 'model');
});

test('forecast adapter preserves a valid consensus loss and reported zero', () => {
  const view = { metric: 'eps', currency: 'SEK', bars: [
    { period: { key: '2025' }, label: '2025', source: 'reported', value: 0 },
    { period: { key: '2026' }, label: '2026E', source: 'consensus', value: -1.5 },
  ] };
  const data = estimateChartModel(view);
  assert.equal(data.unit.kind, 'perShare');
  assert.equal(data.rows[0].values.reported, 0);
  assert.equal(data.rows[1].values.consensus, -1.5);
});

test('distribution does not invent a remainder, scale a partial list or drop zeroes', () => {
  const items = [{ key: 'a', label: 'A', sharePct: 60 }, { key: 'b', label: 'B', sharePct: 0 }];
  const data = distributionModel(items);
  assert.deepEqual(data.map(r => r.sharePct), [60, 0]);
  assert.equal(items[0].color, undefined);
  assert.equal(distributionModel(Array.from({ length: 7 }, (_, i) => ({ key: String(i), label: String(i), sharePct: 10 })))[0].color, null);
});

test('invalid distribution data cannot draw misleading shares', () => {
  for (const items of [null, [], [{ key: 'a', label: 'A', sharePct: null }],
    [{ key: 'a', label: 'A', sharePct: -1 }], [{ key: 'a', label: 'A', sharePct: 101 }],
    [{ key: 'a', label: 'A', sharePct: 70 }, { key: 'b', label: 'B', sharePct: 50 }],
    [{ key: 'a', label: 'A', sharePct: 40 }, { key: 'a', label: 'B', sharePct: 40 }],
  ]) assert.equal(distributionModel(items), null);
});
