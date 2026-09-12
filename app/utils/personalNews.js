import { chronologicalNews, mergeFeed } from './newsroom.js';

// A story can match more than one preference. Its visible reason must not make
// it disappear when the corresponding preference filter is selected.
export function personalMatchKinds(story) {
  return [story.viaWatchlist && 'companies',
    (story.matchedTopic || story.viaIndustry) && 'topics',
    story.matchedKeyword && 'keywords'].filter(Boolean);
}

// Poll responses are bounded authoritative snapshots. Retain newer versions
// and their valid observations when a delayed response contains an older copy.
export function reconcileNewsSnapshot(current, incoming) {
  const existing = new Map(current.map(item => [item.id, item]));
  const accepted = incoming.map(item => {
    const old = existing.get(item.id);
    return old && (old.version ?? 1) > (item.version ?? 1) ? old : item;
  });
  const ids = new Set(accepted.map(item => item.id));
  // An event's primary wire ID can change between snapshots. Drop absent IDs
  // before deduplication so an old representative cannot displace its replacement.
  return chronologicalNews(mergeFeed(current.filter(item => ids.has(item.id)), accepted));
}
