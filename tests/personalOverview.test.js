import test from 'node:test';
import assert from 'node:assert/strict';
import { followedCompanies, groupPersonalCompanies, importantPersonalNews, personalEvents } from '../app/utils/personalOverview.js';
const now = Date.UTC(2026, 8, 28, 12);
const story = (id, overrides = {}) => ({ id, eventId: id, title: 'Bolaget får stor order', importance: 80, ts: now - 1000, companies: [{ symbol: 'ONE', name: 'One' }], ...overrides });
test('personal selection needs direct companies and material news, never price-only attention', () => {
  const items = [story('order'), story('low', { importance: 40, reaction: { pct: 200 } }), story('topic', { companies: [{ symbol: 'OTHER' }] }), story('routine', { title: 'Inbjudan till årsstämma', importance: 99 }), story('insider', { labels: ['INSIDER'], importance: 99 }), story('old', { ts: now - 8 * 86400000 }), story('future', { ts: now + 1 })];
  assert.deepEqual(importantPersonalNews(items, ['ONE'], now).map(x => x.id), ['order']);
  assert.deepEqual(importantPersonalNews(items, [], now), []);
  assert.deepEqual(importantPersonalNews([story('read', { readState: { status: 'read' } })], ['ONE'], now), []);
});
test('multi-company events group under the actual followed identities, once per company', () => {
  const item = story('joint', { companies: [{ symbol: 'OTHER' }, { symbol: 'ONE', name: 'One' }, { symbol: 'one' }, { symbol: 'TWO' }] });
  assert.equal(followedCompanies(item, ['one', 'TWO']).length, 2);
  assert.deepEqual(groupPersonalCompanies([item], ['ONE', 'TWO']).map(x => [x.symbol, x.items.length]), [['ONE', 1], ['TWO', 1]]);
});
test('exact event deduplication retains new stages and rejects retracted stories', () => {
  const items = [story('a'), story('wire', { eventId: 'a', ts: now }), story('new-stage'), story('withdrawn', { status: 'retracted' })];
  assert.deepEqual(personalEvents(items).map(x => x.id), ['wire', 'new-stage']);
});
test('selection is bounded and metrics updates cannot reorder the same headlines', () => {
  const items = [story('a'), story('b', { importance: 90 })];
  assert.deepEqual(importantPersonalNews(items, ['ONE'], now, 1).map(x => x.id), ['b']);
  assert.deepEqual(importantPersonalNews(items.map((x, index) => ({ ...x, reaction: { pct: 100 - index * 90 } })), ['ONE'], now).map(x => x.id), ['b', 'a']);
});
