import test from 'node:test';
import assert from 'node:assert/strict';
import { newsDescription, newsSourceExcerpt } from '../app/utils/newsSummary.js';
import { storyToItem } from '../app/utils/storyToItem.js';
import { normalizeStory, personalStoryToItem, mergeFeed, pendingChanges } from '../app/utils/newsroom.js';

const source = { name: 'placera', publisher: 'Placera', lane: 'context',
  contentRights: 'full_text', contentOrigin: 'rss', rssExcerpt: ' Ordern kommer från Ellevio. Projektet löper över tre år. ' };
const story = { id: 'rss-example', eventId: 'rss-event', version: 1, status: 'flash',
  headline: 'Placera: Acme får order', publishedAt: '2026-10-01T08:00:00Z', importance: 44,
  primarySource: source, summary: 'Deterministisk mall.', aiSummary: null };

test('RSS fallback survives public, personal and reader adapters without posing as AI', () => {
  for (const item of [storyToItem(story), normalizeStory(story), personalStoryToItem(story)]) {
    assert.deepEqual(item.sourceExcerpt, { text: source.rssExcerpt.trim(), publisher: 'Placera', kind: 'rss' });
    assert.equal(item.aiSummary, null);
    assert.equal(item.summary, story.summary);
    assert.equal(item.importance, 44);
    assert.deepEqual(newsDescription(item), { value: { text: source.rssExcerpt.trim(), bullets: [] },
      label: 'Källtext · Placera (RSS)', shortLabel: 'Kort källtext från Placera (RSS)' });
  }
});

test('AI still takes priority; deterministic templates and other outlets do not become source excerpts', () => {
  const item = storyToItem({ ...story, aiSummary: { text: 'En riktig AI-sammanfattning.' } });
  assert.equal(newsDescription(item).label, 'AI-sammanfattning');
  assert.equal(newsDescription(item).value.text, 'En riktig AI-sammanfattning.');
  for (const primarySource of [null, {}, { ...source, name: 'di' }, { ...source, contentRights: 'link_only' },
    { ...source, contentOrigin: undefined }, { ...source, lane: 'wire' }, { ...source, rssExcerpt: {} },
    { ...source, rssExcerpt: ' ' }]) {
    assert.equal(newsSourceExcerpt(primarySource), null);
    assert.equal(newsDescription(storyToItem({ ...story, primarySource })), null);
  }
  assert.equal(newsDescription({ summary: 'Template', sourceExcerpt: { text: {} } }), null);
  assert.equal(newsSourceExcerpt({ ...source, rssExcerpt: 'a'.repeat(2000) }).text.length, 600);
});

test('EFN and Börskollen use their own attributed RSS copy, not the wire summary', () => {
  for (const [name, publisher] of [['efn', 'EFN'], ['borskollen', 'Börskollen']]) {
    const row = { ...story, primarySource: { ...source, name, publisher } };
    for (const item of [storyToItem(row), normalizeStory(row), personalStoryToItem(row)]) {
      assert.equal(item.sourceExcerpt.publisher, publisher);
      assert.equal(newsDescription(item).label, `Källtext · ${publisher} (RSS)`);
      assert.equal(item.aiSummary, null);
      assert.equal(item.importance, 44);
    }
  }
});

test('MFN research has a separately labeled saved lead, never a licensed body or template', () => {
  const primarySource = { name: 'mfn', publisher: 'Redeye', sourceKind: 'research',
    lane: 'context', contentRights: 'excerpt_only', researchExcerpt: 'En sparad analysingress.' };
  const item = storyToItem({ ...story, primarySource });
  assert.deepEqual(item.sourceExcerpt, { text: primarySource.researchExcerpt, publisher: 'Redeye', kind: 'research' });
  assert.equal(newsDescription(item).label, 'Källtext · Redeye (analysingress)');
  for (const changes of [{ sourceKind: 'issuer_release' }, { lane: 'wire' }, { contentRights: 'link_only' },
    { contentRights: 'full_text' }, { name: 'cision' }, { publisher: '' }, { researchExcerpt: undefined }]) {
    assert.equal(newsSourceExcerpt({ ...primarySource, ...changes }), null);
  }
  assert.equal(newsDescription(storyToItem({ ...story, primarySource, aiSummary: { text: 'AI' } })).label, 'AI-sammanfattning');
});

test('RSS enrichment is a visible change but does not reorder news or erase same-version copy', () => {
  const enriched = storyToItem(story);
  const empty = storyToItem({ ...story, primarySource: { ...source, rssExcerpt: undefined } });
  assert.equal(pendingChanges([empty], [enriched]).length, 1);
  assert.equal(pendingChanges([empty], [enriched], { showSummary: false }).length, 0);
  assert.equal(pendingChanges([enriched], [empty]).length, 0);
  assert.deepEqual(mergeFeed([enriched], [empty])[0].sourceExcerpt, enriched.sourceExcerpt);
  assert.equal(mergeFeed([enriched], [{ ...empty, version: 2 }])[0].sourceExcerpt, null);
  assert.equal(pendingChanges([enriched], [{ ...enriched, importance: 99 }]).length, 0);
});
