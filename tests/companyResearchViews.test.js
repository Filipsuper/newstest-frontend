import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateViews, ownershipBars, shortSeries, upcomingCompanyEvents, calendarDateKey, researchMoney } from '../app/utils/companyResearchViews.js';
import { valuationFixture } from './fixtures/valuation.mjs';

test('estimates reuse qualified per-metric consensus then model without annualising', () => {
  const now = Date.parse('2026-09-25T12:00:00Z'), symbol = 'VALUE.TEST';
  const fixture = valuationFixture(symbol, now);
  const views = estimateViews({ symbol, ...fixture, availability: 'available', now });
  assert.equal(views[0].forecasts[0].source, 'consensus');
  assert.equal(views[1].forecasts[0].source, 'model');
  assert.equal(views[2].forecasts[0].source, 'consensus');
  assert.ok(views.every(row => row.frequency === 'quarterly' && row.bars.length === 5));
  assert.ok(views.every(row => row.bars.at(-1).label === 'Q3 2026E'));
  assert.equal(estimateViews({ symbol: 'WRONG', ...fixture, now }).flatMap(row => row.forecasts).length, 0);
  assert.equal(estimateViews({ symbol, ...fixture, availability: 'unavailable', now }).flatMap(row => row.forecasts).length, 0);
});
test('ownership never substitutes votes, null or invalid shares for capital', () => {
  assert.deepEqual(ownershipBars([{ name: 'Votes only', votesPct: 80 }, { name: 'Missing', capitalPct: null }, { name: 'Bad', capitalPct: 120 }, { name: 'Zero', capitalPct: 0 }, { name: 'Owner', capitalPct: 20 }]).map(row => row.name), ['Owner', 'Zero']);
});

test('forecast chart preserves consensus losses and actual zeroes, not a positive model substitution', () => {
  const now = Date.parse('2026-09-25T12:00:00Z'), symbol = 'VALUE.TEST';
  const fixture = valuationFixture(symbol, now);
  fixture.estimates.snapshots[0].metrics.push({ key: 'ebit', amount: -10e6, unit: 'SEK', currency: 'SEK' });
  fixture.financials.quarterly.at(-1).ebit = 0;
  const view = estimateViews({ symbol, ...fixture, availability: 'available', now }).find(view => view.metric === 'ebit');
  assert.equal(view.forecasts[0].source, 'consensus');
  assert.equal(view.forecasts[0].value, -10e6);
  assert.equal(view.bars.at(-2).value, 0);
});
test('short history does not need price data or fabricate today, sorts and retains real dates', () => {
  const rows = shortSeries({ series: [{ date: '2026-09-20', pct: 2 }, { date: '2026-01-01', pct: 1 }, { date: '2026-07-01', pct: 0 }, { date: '2026-09-21', pct: null }, { date: 'bad', pct: 3 }] }, '3m');
  assert.deepEqual(rows.map(row => [row.date, row.pct]), [['2026-07-01', 0], ['2026-09-20', 2]]);
  assert.equal(shortSeries({ series: [{ date: '2026-01-01', pct: 0 }] }).length, 1);
});
test('agenda rejects invalid dates and deduplicates provider summary against events', () => {
  assert.equal(calendarDateKey('2026-02-30'), null);
  const events = upcomingCompanyEvents({ events: [{ type: 'earnings', date: '2026-10-20', fiscalPeriod: '2026-Q3' }, { type: 'agm', date: 'bad' }, { type: 'dividend', date: '2025-01-01' }], earningsDates: ['2026-10-20'], dividendDate: '2026-11-01' }, '2026-09-25');
  assert.equal(events.length, 2);
  assert.equal(events[0].fiscalPeriod, '2026-Q3');
});
test('display amounts preserve unknown, zero and signs', () => {
  assert.equal(researchMoney(null), 'Saknas');
  assert.equal(researchMoney(0), '0 SEK');
  assert.equal(researchMoney(-1000000), '−1 M SEK');
});
