import test from 'node:test';
import assert from 'node:assert/strict';
import { publicNewsPreview, PUBLIC_NEWS_PREVIEW_LIMIT } from '../app/utils/publicNewsPreview.js';

const base = Date.parse('2026-10-06T10:00:00Z');
const story = (index, overrides = {}) => ({
  id: `public-${index}`, eventId: `event-${index}`, version: 1,
  headline: `Bolag ${index} tecknar avtal`,
  publishedAt: new Date(base - index * 60_000).toISOString(),
  companies: [{ symbol: `TEST${index}.ST`, name: `Bolag ${index}` }],
  primarySource: { name: 'mfn', language: 'sv' }, tags: ['ORDER'],
  ...overrides,
});

test('public selection is chronological, deduplicated and capped without mutating the source', () => {
  const news = Array.from({ length: 30 }, (_, i) => story(i)).reverse();
  const data = { news, moverNews: [story(0)] };
  const result = publicNewsPreview(data);
  assert.equal(result.length, PUBLIC_NEWS_PREVIEW_LIMIT);
  assert.deepEqual(result.map(row => row.id), Array.from({ length: 16 }, (_, i) => `public-${i}`));
  assert.equal(result[0].title, 'Bolag 0 tecknar avtal');
  assert.equal(result[0].symbol, 'TEST0.ST');
  assert.equal(data.news[0].id, 'public-29');
});

test('public rows retain the Swedish listing scope and exclude unavailable stories', () => {
  const result = publicNewsPreview({ news: { items: [
    story(0, { status: 'withdrawn' }),
    story(1, { publishedAt: 'invalid' }),
    story(2, { headline: '' }),
    story(3, { companies: [{ symbol: 'US.TEST', exchangeMic: 'XNAS' }] }),
    story(4, { companies: [], primarySource: { name: 'riksbank' } }),
    story(5),
  ] } });
  assert.deepEqual(result.map(row => row.id), ['public-4', 'public-5']);
});

test('missing news is an error, while a confirmed empty public selection stays empty', () => {
  assert.throws(() => publicNewsPreview({}), /Nyhetsurvalet/);
  assert.deepEqual(publicNewsPreview({ news: [] }), []);
});

test('ordinary latestNews takes priority over featured and mover pools, including low-importance non-featured news', () => {
  const result = publicNewsPreview({
    latestNews: [story(1, { importance: 20, featuredEligible: false, editorial: { kind: 'omxsum_news', eligible: false } }), story(0, { importance: 15 })],
    news: [story(2, { importance: 95 })], moverNews: [story(3, { importance: 100 })],
  });
  assert.deepEqual(result.map(row => row.id), ['public-0', 'public-1']);
  assert.equal(result[1].featuredEligible, false);
  assert.equal(result[1].importance, 20);
});

test('confirmed empty or malformed ordinary pool never silently becomes the featured pool', () => {
  assert.deepEqual(publicNewsPreview({ latestNews: [], news: [story(0)], moverNews: [story(1)] }), []);
  assert.throws(() => publicNewsPreview({ latestNews: null, news: [story(0)] }), /Nyhetsurvalet/);
  assert.equal(publicNewsPreview({ latestNews: { items: [story(0)] } }).length, 1);
});
