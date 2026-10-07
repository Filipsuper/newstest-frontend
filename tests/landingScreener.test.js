import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDING_SCREENER_EXAMPLE } from '../app/utils/landingScreener.js';
import { formatScreenerValue } from '../app/utils/screener.js';

test('dated landing examples compare verified EBIT margins from one reported period', () => {
  const example = LANDING_SCREENER_EXAMPLE;
  assert.equal(example.capturedAt, '2026-10-03');
  assert.equal(example.periodEnd, '2025-12-31');
  assert.deepEqual(example.items.map(row => row.symbol), ['ATCO-A.ST', 'ERIC-B.ST', 'SAAB-B.ST']);
  assert.deepEqual(example.items.map(row => formatScreenerValue(row.value, 'pct')), ['20,5%', '17,3%', '10,9%']);
  assert.equal(example.filter.metric, 'ebitMarginPct');
  assert.ok(example.items.every(row => row.value > example.filter.minimumExclusive));
  assert.ok(example.items.every((row, i) => i === 0 || example.items[i - 1].value >= row.value));
});
test('examples preserve all six profile axes, genuine zero scores and coverage', () => {
  for (const row of LANDING_SCREENER_EXAMPLE.items) {
    assert.ok(Number.isFinite(row.value));
    assert.deepEqual(row.profile.axes.map(axis => axis.key), ['value', 'growth', 'past', 'health', 'insiders', 'dividend']);
    assert.ok(row.profile.axes.every(axis => Number.isFinite(axis.score) && axis.score >= 0 && axis.score <= 5));
  }
  assert.equal(LANDING_SCREENER_EXAMPLE.items[0].profile.axes[0].score, 0);
  assert.equal(LANDING_SCREENER_EXAMPLE.items[1].profile.coveragePct, 96);
});
