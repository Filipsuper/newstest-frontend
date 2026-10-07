import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalFeedCache, personalFeedScope } from '../app/utils/personalFeedCache.js';

const user = { email: 'reader@example.test', plan: 'plus', verified: true, watchlist: ['ONE'],
  topics: ['ORDER'], keywords: [], excludedKeywords: [] };
const query = { limit: 20, filter: 'companies' };
const data = { stories: [{ id: 'one', readState: { receipt: 'one-v1', status: 'unread' } }],
  importantStories: [{ id: 'one', readState: { receipt: 'one-v1', status: 'unread' } }] };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('fresh feed avoids another request, stale data remains available while refreshing, then expires', async () => {
  let time = 0, calls = 0;
  const cache = createPersonalFeedCache({ now: () => time }); cache.setUser(user);
  const fetcher = async () => { calls++; return data; };
  await cache.load(user, query, fetcher);
  await cache.load(user, query, fetcher);
  assert.equal(calls, 1);
  time = 30_000;
  const next = deferred();
  const refresh = cache.load(user, query, () => next.promise);
  assert.equal(cache.get(user, query).data, data);
  next.resolve({ stories: [] }); await refresh;
  assert.deepEqual(cache.get(user, query).data.stories, []);
  time += 300_000;
  assert.equal(cache.get(user, query), null);
});

test('prefetch and mounted views share a request; aborting one reader does not cancel the others', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const next = deferred(), controller = new AbortController(); let calls = 0, ownerSignal;
  const fetcher = options => { calls++; ownerSignal = options.signal; return next.promise; };
  const prefetch = cache.load(user, { ...query, signal: controller.signal }, fetcher);
  const view = cache.load(user, query, fetcher);
  controller.abort();
  await assert.rejects(prefetch, { name: 'AbortError' });
  assert.equal(ownerSignal.aborted, false);
  next.resolve(data);
  assert.equal(await view, data); assert.equal(calls, 1);
});

test('account, logout, plan and preference changes discard snapshots and late responses', async () => {
  for (const nextUser of [null, { ...user, email: 'other@example.test' }, { ...user, plan: 'free' },
    { ...user, watchlist: ['TWO'] }, { ...user, topics: ['REPORT'] }, { ...user, keywords: ['battery'] },
    { ...user, excludedKeywords: ['routine'] }, { ...user, trial: { status: 'expired', endsAt: 42 } }]) {
    const cache = createPersonalFeedCache(); cache.setUser(user);
    await cache.load(user, query, async () => data);
    const next = deferred(); let signal;
    const request = cache.load(user, { ...query, force: true }, options => { signal = options.signal; return next.promise; });
    await Promise.resolve();
    cache.setUser(nextUser);
    assert.equal(signal.aborted, true); assert.equal(cache.get(user, query), null);
    next.resolve(data); assert.equal(await request, null);
    assert.equal(cache.get(nextUser, query), null);
  }
  assert.equal(personalFeedScope({ email: null }), null);
});

test('failed refresh does not replace cached news; successful empty results are cached', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  await cache.load(user, query, async () => data);
  for (const failure of [null, { unavailable: true, stories: [] }, {}]) {
    await cache.load(user, { ...query, force: true }, async () => failure);
    assert.equal(cache.get(user, query).data, data);
  }
  await cache.load(user, { ...query, force: true }, async () => ({ stories: [] }));
  assert.deepEqual(cache.get(user, query).data.stories, []);
});

test('read receipts update only the exact cached version and force a background refresh', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  await cache.load(user, query, async () => ({ ...data, stories: [...data.stories,
    { id: 'one', readState: { receipt: 'one-v2', status: 'unread' } }] }));
  cache.markRead(['one-v1']);
  const cached = cache.get(user, query);
  assert.equal(cached.invalidated, true);
  assert.deepEqual(cached.data.stories.map(story => story.readState.status), ['read', 'unread']);
  assert.equal(cached.data.importantStories[0].readState.status, 'read');
  let calls = 0;
  await cache.load(user, query, async () => { calls++; return data; });
  assert.equal(calls, 1);
});

test('a late read acknowledgement cannot cancel or invalidate a changed account or preference scope', async () => {
  for (const nextUser of [{ ...user, email: 'another@example.test' }, { ...user, keywords: ['new'] }, null]) {
    const cache = createPersonalFeedCache(); cache.setUser(user);
    const requestScope = cache.getScope();
    cache.setUser(nextUser);
    const revision = cache.getRevision();
    const next = deferred(); let signal;
    const pending = nextUser ? cache.load(nextUser, query, options => { signal = options.signal; return next.promise; }) : null;
    await Promise.resolve();
    cache.markRead(['one-v1'], requestScope);
    assert.equal(cache.getRevision(), revision);
    if (nextUser) {
      assert.equal(signal.aborted, false);
      next.resolve(data); assert.equal(await pending, data);
      assert.equal(cache.get(nextUser, query).invalidated, false);
    }
  }
});

test('cursor pages are not cached and first-page filters are isolated and bounded', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user); let calls = 0;
  const fetcher = async () => { calls++; return data; };
  for (const options of [{ ...query, cursor: 'older' }, { ...query, after: 'newer' }]) {
    await cache.load(user, options, fetcher); await cache.load(user, options, fetcher);
    assert.equal(cache.get(user, options), null);
  }
  assert.equal(calls, 4);
  await cache.load(user, query, fetcher);
  assert.equal(cache.get(user, { ...query, filter: 'topics' }), null);
  for (let limit = 21; limit <= 32; limit++) await cache.load(user, { ...query, limit }, fetcher);
  assert.equal(cache.get(user, query), null);
  assert.ok(cache.get(user, { ...query, limit: 32 }));
});

test('two cached headlines seed a route immediately without satisfying its chronological or curated load', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const preview = { stories: [{ ...data.stories[0], viaWatchlist: true }], preview: true,
    coverage: { complete: true }, nextCursor: null };
  await cache.load(user, { limit: 2, filter: 'companies', view: 'preview' }, async () => preview);
  const latest = { limit: 20, filter: 'all', view: 'headlines' };
  const important = { limit: 20, filter: 'companies', view: 'important' };
  for (const query of [latest, important]) {
    const seed = cache.seed(user, query);
    assert.equal(seed.data.stories[0].id, 'one');
    assert.equal(seed.data.interim, true);
    assert.equal(seed.data.coverage.complete, false);
    assert.equal(seed.data.coverage.reason, 'interim_preview');
    assert.equal(seed.data.nextCursor, null);
    assert.equal(cache.get(user, query), null);
  }
  assert.equal(cache.seed(user, { ...latest, filter: 'keywords' }), null);
  assert.equal(cache.seed({ ...user, email: 'other@example.test' }, latest), null);
  const next = deferred(); let calls = 0;
  const pending = cache.load(user, latest, () => { calls++; return next.promise; });
  await Promise.resolve();
  assert.equal(calls, 1); assert.equal(cache.seed(user, latest).data.interim, true);
  next.resolve({ stories: [], coverage: { complete: true } }); await pending;
  assert.equal(cache.seed(user, latest).data.interim, undefined);
  assert.deepEqual(cache.seed(user, latest).data.stories, []);
});

test('curated empty results remain authoritative, and curated stories never seed a chronological page', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const important = { limit: 20, filter: 'companies', view: 'important' };
  await cache.load(user, important, async () => ({ stories: [], curated: true, coverage: { complete: true } }));
  await cache.load(user, { limit: 2, filter: 'companies', view: 'preview' }, async () => ({
    stories: [{ ...data.stories[0], viaWatchlist: true, importance: 99 }],
  }));
  assert.deepEqual(cache.seed(user, important).data.stories, []);
  const isolated = createPersonalFeedCache(); isolated.setUser(user);
  await isolated.load(user, important, async () => ({ stories: data.stories, curated: true }));
  assert.equal(isolated.seed(user, { limit: 20, filter: 'all', view: 'headlines' }), null);
});

test('cache subscribers observe independent headline and curated arrivals and privacy invalidation', async () => {
  const cache = createPersonalFeedCache(); cache.setUser(user);
  const changes = []; const stop = cache.subscribe(() => changes.push(cache.getRevision()));
  const curated = deferred();
  const pending = cache.load(user, { ...query, view: 'important' }, () => curated.promise);
  const latest = { ...query, view: 'headlines' };
  await cache.load(user, latest, async () => data);
  assert.equal(cache.get(user, latest).data, data);
  assert.equal(changes.length, 1);
  curated.resolve({ stories: [] }); await pending;
  assert.equal(changes.length, 2);
  cache.markRead(['one-v1']); assert.equal(changes.length, 3);
  cache.setUser(null); assert.equal(changes.length, 4);
  assert.equal(cache.seed(user, latest), null);
  stop(); cache.setUser(user); assert.equal(changes.length, 4);
});
