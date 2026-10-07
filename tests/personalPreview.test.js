import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePersonalPreviewObservations, PERSONAL_PREVIEW_QUERY } from '../app/utils/personalPreview.js';
import { createPersonalFeedCache } from '../app/utils/personalFeedCache.js';

const user = { email: 'reader@example.test', plan: 'free', watchlist: ['ONE.ST'] };
const story = { id: 'one', version: 2, headline: 'Original news', publishedAt: '2026-10-01T10:00:00Z',
  companies: [{ symbol: 'ONE.ST', name: 'One' }], viaWatchlist: true };
const data = { stories: [story], preview: true };
const query = PERSONAL_PREVIEW_QUERY;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('metrics preserve copy/order and only apply to the exact version, company set and publication time', () => {
  const items = [story, { ...story, id: 'two' }];
  const next = mergePersonalPreviewObservations(items, [{ ...story, headline: 'Changed copy', reaction: { pct: 2 } }]);
  assert.equal(next[0].headline, 'Original news'); assert.equal(next[0].viaWatchlist, true);
  assert.equal(next[0].reaction.pct, 2); assert.deepEqual(next.map(row => row.id), ['one', 'two']);
  for (const wrong of [{ version: 3 }, { publishedAt: '2026-10-01T11:00:00Z' }, { companies: [{ symbol: 'OTHER.ST' }] }])
    assert.equal(mergePersonalPreviewObservations([story], [{ ...story, ...wrong, reaction: { pct: 99 } }])[0].reaction, undefined);
});

test('preview and full feed cache entries cannot be confused even with the same limit', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  await cache.load(user, query, async () => data);
  assert.equal(cache.get(user, { limit: 2, filter: 'companies' }), null);
});

test('headlines are cached before optional metrics; metrics share one request and survive remount', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const snapshot = await cache.load(user, query, async () => data);
  const delayed = deferred(); let calls = 0;
  const fetcher = async () => { calls++; return delayed.promise; };
  const first = cache.loadObservations(user, query, snapshot, fetcher);
  const second = cache.loadObservations(user, query, snapshot, fetcher);
  assert.equal(cache.get(user, query).data, snapshot);
  delayed.resolve({ items: [{ ...story, reaction: { pct: 2 } }] });
  const enriched = await first; assert.equal(await second, enriched);
  assert.equal(calls, 1); assert.equal(enriched.stories[0].reaction.pct, 2);
  assert.equal(await cache.loadObservations(user, query, enriched, fetcher), enriched);
  assert.equal(calls, 1);
});

test('failed metrics retain headlines and allow retry; late metrics cannot overwrite a newer snapshot or account', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const snapshot = await cache.load(user, query, async () => data);
  await assert.rejects(cache.loadObservations(user, query, snapshot, async () => { throw new Error('offline'); }));
  assert.equal(cache.get(user, query).data, snapshot);
  const next = deferred();
  const pending = cache.loadObservations(user, query, snapshot, () => next.promise);
  await Promise.resolve();
  const revised = { stories: [{ ...story, version: 3 }] };
  await cache.load(user, { ...query, force: true }, async () => revised);
  next.resolve({ items: [{ ...story, reaction: { pct: 99 } }] });
  assert.equal(await pending, null); assert.equal(cache.get(user, query).data, revised);
  const later = deferred(); let signal;
  const changing = cache.loadObservations(user, query, revised, (_, owned) => { signal = owned; return later.promise; });
  await Promise.resolve(); cache.setUser({ ...user, watchlist: [] });
  assert.equal(signal.aborted, true);
  later.resolve({ items: [] }); assert.equal(await changing, null);
  assert.equal(cache.get(user, query), null);
});

test('canceling one observation consumer does not cancel another mounted consumer', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const snapshot = await cache.load(user, query, async () => data);
  const next = deferred(), controller = new AbortController(); let signal;
  const fetcher = (_, owned) => { signal = owned; return next.promise; };
  const canceled = cache.loadObservations(user, { ...query, signal: controller.signal }, snapshot, fetcher);
  const surviving = cache.loadObservations(user, query, snapshot, fetcher);
  controller.abort(); await assert.rejects(canceled, { name: 'AbortError' });
  assert.equal(signal.aborted, false);
  next.resolve({ items: [] }); assert.ok(await surviving);
});

test('independent displayed pools share observations without replacing their copy, order or read state', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const headlineQuery = { limit: 20, filter: 'all', view: 'headlines' };
  const curatedQuery = { limit: 20, filter: 'companies', view: 'important' };
  const headline = await cache.load(user, headlineQuery, async () => ({ stories: [{ ...story,
    readState: { status: 'read', receipt: 'one-v2' } }] }));
  const curated = await cache.load(user, curatedQuery, async () => ({ stories: [{ ...story, headline: 'Curated original' }], curated: true }));
  const next = deferred(); let calls = 0;
  const fetcher = () => { calls++; return next.promise; };
  const first = cache.loadObservations(user, headlineQuery, headline, fetcher);
  const second = cache.loadObservations(user, curatedQuery, curated, fetcher);
  next.resolve({ items: [{ ...story, headline: 'Do not use this', reaction: { pct: 3 },
    aiSummary: { text: 'Verified summary', bullets: [] } }] });
  const [updatedHeadlines, updatedCurated] = await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(updatedHeadlines.stories[0].reaction.pct, 3);
  assert.equal(updatedCurated.stories[0].reaction.pct, 3);
  assert.equal(updatedHeadlines.stories[0].headline, story.headline);
  assert.equal(updatedCurated.stories[0].headline, 'Curated original');
  assert.equal(updatedHeadlines.stories[0].readState.status, 'read');
  assert.equal(updatedCurated.curated, true);
  assert.equal(updatedCurated.stories[0].aiSummary.text, 'Verified summary');
});

test('headline refresh retains verified exact-version measurements while their asynchronous refresh is pending', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const query = { limit: 20, filter: 'all', view: 'headlines' };
  await cache.load(user, query, async () => ({ stories: [{ ...story, reaction: { pct: 2, asOf: 100 } }] }));
  const refreshed = await cache.load(user, { ...query, force: true }, async () => ({ stories: [story], observationsDeferred: true }));
  assert.equal(refreshed.stories[0].reaction.pct, 2);
  const revised = await cache.load(user, { ...query, force: true }, async () => ({
    stories: [{ ...story, version: 3 }], observationsDeferred: true,
  }));
  assert.equal(revised.stories[0].reaction, undefined);
});
