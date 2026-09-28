import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedNews } from '../app/utils/newsSelection.js';
test('selected feed filters routine notices without ranking or price-only promotion', () => {
  assert.equal(selectedNews({ title: 'Stor order', importance: 60 }), true);
  assert.equal(selectedNews({ title: 'Inbjudan till stämma', importance: 100 }), false);
  assert.equal(selectedNews({ title: 'Bolagsnytt', importance: 20, reaction: { pct: 200 } }), false);
  assert.equal(selectedNews({ title: 'Insynshandel', importance: 99, labels: ['INSIDER'] }), false);
  assert.equal(selectedNews({ title: 'Ny order', importance: 90, status: 'withdrawn' }), false);
});
