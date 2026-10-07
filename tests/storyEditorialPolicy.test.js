import test from 'node:test';
import assert from 'node:assert/strict';
import { storyToItem, storyEditorialPolicy } from '../app/utils/storyToItem.js';
import { feedStoryToItem } from '../app/utils/feedObservations.js';
import { mergeFeed } from '../app/utils/newsroom.js';

const story = { id: 'editorial-fixture', headline: 'Banken höjer riktkursen', publishedAt: '2026-10-07T08:00:00Z',
  version: 2, importance: 55, companies: [{ name: 'Bolaget', symbol: 'TEST.ST' }], tags: ['RECOMMENDATION'] };

test('REST and stream mappers carry explicit featured policy without changing importance or ordinary copy', () => {
  for (const map of [storyToItem, feedStoryToItem]) {
    const item = map({ ...story, featuredEligible: false, editorial: { kind: 'omxsum_news', label: 'OMXsum nyhet',
      featuredEligible: false, score: 55, publicationTier: 'brief', sourceCoverage: 'partial', originalStoryIds: ['story-source'] } });
    assert.equal(item.featuredEligible, false);
    assert.equal(item.editorial.kind, 'omxsum_news');
    assert.equal(item.editorial.score, 55);
    assert.equal(item.editorial.publicationTier, 'brief');
    assert.equal(item.editorial.sourceCoverage, 'partial');
    assert.equal(item.importance, 55);
    assert.equal(item.title, story.headline);
  }
});

test('existing eligible flag is supported and any explicit false beats mixed-version true flags', () => {
  assert.equal(storyToItem({ ...story, editorial: { kind: 'omxsum_news', eligible: false } }).featuredEligible, false);
  assert.equal(storyToItem({ ...story, featuredEligible: true, editorial: { kind: 'omxsum_news', eligible: false } }).featuredEligible, false);
  assert.equal(storyToItem({ ...story, editorial: { kind: 'omxsum_news', featuredEligible: true } }).featuredEligible, true);
  assert.equal(storyToItem({ ...story, featuredEligible: 'false' }).featuredEligible, undefined);
});

test('editorial projection allowlists presentation fields and does not carry private producer data', () => {
  const policy = storyEditorialPolicy({ editorial: { kind: 'omxsum_news', label: ' OMXsum nyhet ', score: 55,
    sourceFingerprint: 'private-fingerprint', body: 'private-source-body', validation: { issues: ['private'] },
    model: 'private-model', tokenUsage: 123, originalStoryIds: ['valid-source', '../private', 'x'.repeat(81)] } });
  assert.deepEqual(policy, { editorial: { kind: 'omxsum_news', label: 'OMXsum nyhet', score: 55, originalStoryIds: ['valid-source'] }, featuredEligible: undefined });
  assert.equal(storyEditorialPolicy({ editorial: { kind: 'unknown', score: 80 } }).editorial, null);
});

test('legacy stories keep absent policy and a source fallback clears prior featured veto on merge', () => {
  const legacy = storyToItem(story);
  assert.equal(legacy.editorial, null); assert.equal(legacy.featuredEligible, undefined);
  const own = storyToItem({ ...story, editorial: { kind: 'omxsum_news', eligible: false } });
  const fallback = storyToItem({ ...story, version: 3, editorial: { kind: 'source', label: 'Källnyhet' } });
  const [merged] = mergeFeed([own], [fallback]);
  assert.equal(merged.editorial.kind, 'source'); assert.equal(merged.featuredEligible, undefined);
});
