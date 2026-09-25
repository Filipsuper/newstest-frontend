import test from 'node:test';
import assert from 'node:assert/strict';
import { donutSlices } from '../app/utils/donut.js';

const series = shares => shares.map((sharePct, index) => ({ key: `segment-${index}`, sharePct, color: `var(--ui-chart-${index + 1})` }));

test('donut geometry uses the supplied shares without reordering or mutating them', () => {
  const input = series([45, 22, 16, 17]);
  const snapshot = structuredClone(input);
  assert.deepEqual(donutSlices(input), input.map((item, index) => ({ ...item, start: [0, 45, 67, 83][index], sweep: item.sharePct })));
  assert.deepEqual(input, snapshot);
});

test('donut preserves small slices and omits zero geometry without removing legend data', () => {
  const input = series([76, 23.8, .2, 0]);
  const slices = donutSlices(input);
  assert.equal(slices.length, 3);
  assert.equal(slices[2].sweep, .2);
  assert.equal(input.length, 4);
  assert.deepEqual(donutSlices(series([0, 0])), []);
  assert.deepEqual(donutSlices(series([0, 100])).map(({ start, sweep }) => [start, sweep]), [[0, 100]]);
});

test('donut does not fill a rounding shortfall or wrap an excess around the circle', () => {
  const shortfall = donutSlices(series([60, 39.99]));
  assert.ok(Math.abs(shortfall.at(-1).start + shortfall.at(-1).sweep - 99.99) < 1e-10);
  assert.ok(shortfall.at(-1).start + shortfall.at(-1).sweep < 100);
  const excess = donutSlices(series([60, 40.01]));
  assert.equal(excess.at(-1).sharePct, 40.01);
  assert.equal(excess.at(-1).sweep, 40);
  assert.equal(excess.at(-1).start + excess.at(-1).sweep, 100);
});

test('invalid shares never create SVG geometry', () => {
  for (const value of [-1, 101, null, undefined, NaN, Infinity, '20']) assert.deepEqual(donutSlices(series([value])), []);
  for (const input of [null, undefined, {}, [null]]) assert.deepEqual(donutSlices(input), []);
});
