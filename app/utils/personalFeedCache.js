import { waitForSharedRequest } from './sharedRequest.js';
import { mergePersonalPreviewObservations } from './personalPreview.js';

export const PERSONAL_FEED_CACHE_MS = 30_000;
const MAX_AGE_MS = 5 * 60_000;
const MAX_ENTRIES = 12;

export function personalFeedScope(user) {
  if (!user?.email) return null;
  return JSON.stringify([user.email, user.plan, user.verified, user.trial?.status,
    user.trial?.endsAt, user.watchlist ?? [], user.topics ?? [], user.keywords ?? [], user.excludedKeywords ?? []]);
}

// Browser-session memory only. No localStorage, server cache, or cached account
// authorization. An authoritative account/preference change invalidates scope.
export function createPersonalFeedCache({ now = () => Date.now() } = {}) {
  const entries = new Map(), pending = new Map(), listeners = new Set();
  let scope = null, generation = 0, revision = 0;
  function publish() { revision++; for (const listener of listeners) listener(); }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function cancelPending() {
    generation++;
    for (const request of pending.values()) request.controller.abort();
    pending.clear();
  }
  function setUser(user) {
    const next = personalFeedScope(user);
    if (scope === next) return;
    cancelPending(); entries.clear(); scope = next; publish();
  }
  const keyFor = options => JSON.stringify([options.filter ?? 'all', options.limit ?? 40, options.view ?? 'full']);
  function get(user, options = {}) {
    if (!scope || personalFeedScope(user) !== scope || options.cursor || options.after) return null;
    const key = keyFor(options), entry = entries.get(key);
    if (!entry) return null;
    if (now() - entry.at >= MAX_AGE_MS) { entries.delete(key); return null; }
    return entry;
  }
  // A two-headline company preview can paint a route immediately, but it is
  // never a complete catch-up page or a server-curated selection. Pools remain
  // separate: this explicit interim seed must not be used to satisfy a load.
  function seed(user, options = {}) {
    const exact = get(user, options);
    if (exact) return exact;
    const filter = options.filter ?? 'all';
    if (!scope || personalFeedScope(user) !== scope || options.cursor || options.after) return null;
    if (options.view === 'important') {
      for (const source of [{ limit: 20, filter: 'companies' }, { limit: 20, filter: 'all' }]) {
        const entry = get(user, source);
        if (Array.isArray(entry?.data.importantStories)) return { ...entry,
          data: { ...entry.data, stories: entry.data.importantStories, coverage: entry.data.importantCoverage,
            nextCursor: null, curated: true } };
      }
    }
    if (!['all', 'companies'].includes(filter)) return null;
    const candidates = [{ limit: 20, filter, view: 'headlines' }, { limit: 20, filter },
      ...(filter === 'companies' ? [{ limit: 20, filter: 'all', view: 'headlines' }, { limit: 20, filter: 'all' }] : []),
      { limit: 2, filter: 'companies', view: 'preview' }];
    for (const source of candidates) {
      // An important pool must never become a chronological page.
      if (options.view === 'headlines' && source.view === 'headlines' && source.filter === filter) continue;
      const entry = get(user, source);
      if (!entry) continue;
      const companyOnly = options.view === 'important' || filter === 'companies';
      const stories = companyOnly ? entry.data.stories.filter(story => story.viaWatchlist) : entry.data.stories;
      const complete = options.view !== 'important' && source.view !== 'preview' && source.filter === filter;
      return { ...entry, interim: !complete, data: { ...entry.data, stories: stories.slice(0, options.limit ?? 20),
        ...(complete ? {} : { coverage: { ...entry.data.coverage, complete: false, reason: 'interim_preview' },
          nextCursor: null, readStateAvailable: entry.data.readStateAvailable === true, interim: true }),
      } };
    }
    return null;
  }
  async function load(user, options, fetchFeed) {
    if (!scope || personalFeedScope(user) !== scope) return null;
    if (options.cursor || options.after) return fetchFeed(options);
    const { signal, force, ...query } = options;
    const entry = get(user, query), key = keyFor(query);
    if (!force && entry && !entry.invalidated && now() - entry.at < PERSONAL_FEED_CACHE_MS) return entry.data;
    let request = pending.get(key);
    if (!request) {
      const controller = new AbortController(), version = generation;
      request = { controller, promise: null };
      request.promise = Promise.resolve().then(() => fetchFeed({ ...query, signal: controller.signal }))
        .then(data => {
          if (version !== generation || controller.signal.aborted) return null;
          if (!data || data.unavailable || !Array.isArray(data.stories)) return data;
          // Deferred headlines say nothing about already verified metrics. A
          // refresh may retain exact-version observations, never an older news
          // revision or another company/publication timestamp's prices.
          if (data.observationsDeferred && entry?.data.stories)
            data = { ...data, stories: mergePersonalPreviewObservations(data.stories, entry.data.stories) };
          entries.delete(key); entries.set(key, { data, at: now(), invalidated: false });
          while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
          publish();
          return data;
        }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
      pending.set(key, request);
    }
    return waitForSharedRequest(request.promise, signal);
  }
  async function loadObservations(user, options, snapshot, fetchObservations) {
    const entry = get(user, options);
    if (!entry || entry.data !== snapshot || !snapshot.stories.length) return null;
    if (entry.observedAt !== undefined && now() - entry.observedAt < 15_000) return entry.data;
    const key = `observations:${snapshot.stories.map(story => `${story.id}:${story.version ?? 1}`).join(',')}`;
    let request = pending.get(key);
    if (!request) {
      const controller = new AbortController(), version = generation;
      request = { controller, promise: null };
      request.promise = Promise.resolve().then(() => fetchObservations(snapshot.stories, controller.signal)).then(result =>
        version !== generation || controller.signal.aborted ? null : result)
        .finally(() => { if (pending.get(key) === request) pending.delete(key); });
      pending.set(key, request);
    }
    const result = await waitForSharedRequest(request.promise, options.signal);
    if (get(user, options) === entry && entry.observedSnapshot === snapshot) return entry.data;
    if (get(user, options) !== entry || entry.data !== snapshot || !Array.isArray(result?.items)) return null;
    entry.data = { ...snapshot, stories: mergePersonalPreviewObservations(snapshot.stories, result.items),
      ...(Array.isArray(snapshot.importantStories) ? {
        importantStories: mergePersonalPreviewObservations(snapshot.importantStories, result.items),
      } : {}) };
    entry.observedAt = now();
    entry.observedSnapshot = snapshot;
    publish();
    return entry.data;
  }
  function markRead(receipts, requestScope = scope) {
    // An acknowledgement may arrive after sign-out or an account/preference
    // change. It must not cancel or invalidate that new reader's requests.
    if (!scope || requestScope !== scope) return;
    cancelPending();
    const acknowledged = new Set(receipts);
    const update = story => acknowledged.has(story.readState?.receipt)
      ? { ...story, readState: { ...story.readState, status: 'read' } } : story;
    for (const entry of entries.values()) {
      entry.data = { ...entry.data, stories: entry.data.stories.map(update),
        ...(Array.isArray(entry.data.importantStories) ? { importantStories: entry.data.importantStories.map(update) } : {}) };
      entry.invalidated = true;
    }
    publish();
  }
  return { setUser, get, seed, load, loadObservations, markRead, subscribe,
    getScope: () => scope, getRevision: () => revision };
}

export const personalFeedCache = createPersonalFeedCache();
