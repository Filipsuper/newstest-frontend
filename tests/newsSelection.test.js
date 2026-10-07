import test from 'node:test';
import assert from 'node:assert/strict';
import { newsFeedSelection, selectedNews } from '../app/utils/newsSelection.js';
test('chronological all is the default; only explicit selected changes the ordinary feed', () => {
  for (const value of [undefined, null, '', 'all', 'unknown']) assert.equal(newsFeedSelection(value), 'all');
  assert.equal(newsFeedSelection('selected'), 'selected');
  assert.equal(newsFeedSelection('selected', { compact: true }), 'all');
});
test('selected feed filters routine notices without ranking or price-only promotion', () => {
  assert.equal(selectedNews({ title: 'Stor order', importance: 60 }), true);
  assert.equal(selectedNews({ title: 'Inbjudan till stämma', importance: 100 }), false);
  assert.equal(selectedNews({ title: 'Bolagsnytt', importance: 20, reaction: { pct: 200 } }), false);
  assert.equal(selectedNews({ title: 'Insynshandel', importance: 99, labels: ['INSIDER'] }), false);
  assert.equal(selectedNews({ title: 'Ny order', importance: 90, status: 'withdrawn' }), false);
});
test('selected inclusion is independent of featured eligibility and remains an explicit threshold', () => {
  assert.equal(selectedNews({ title: 'Bolaget föreslår ett nytt förvärv', importance: 60, featuredEligible: false }), true);
  assert.equal(selectedNews({ title: 'Banken justerar riktkursen', importance: 55, featuredEligible: false }), false);
});
