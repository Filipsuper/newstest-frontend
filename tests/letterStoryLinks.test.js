import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedLetterBlocks } from '../app/utils/letterStoryLinks.js';
import { letterBlocks } from '../app/utils/editorial.js';

const blocks = [{ type: 'heading', text: 'Bolagen', sourceStoryIds: [] },
  { type: 'paragraph', text: '&&Saab&& höjer prognosen. /green/+5 %/green/', sourceStoryIds: ['story-a'] },
  { type: 'paragraph', text: 'Räntorna ligger oförändrade.', sourceStoryIds: [] }];
const summary = blocks.map(b => b.type === 'heading' ? `##${b.text}##` : b.text).join('\n\n');
const document = () => ({ schemaVersion: 1, blocks: structuredClone(blocks), sources: [
  { id: 'story-a', eventId: 'event-common', version: 2, headline: 'Saab: Höjd prognos', publishedAt: '2026-10-06T08:00:00Z' },
] });

test('legacy letters retain their exact existing blocks with no guessed links', () => {
  for (const prose of [summary, 'Ett bolag nämns.\n\n##En rubrik##\nMer text.', '', null]) {
    assert.deepEqual(linkedLetterBlocks(prose), letterBlocks(prose).map(b => ({ ...b, sources: [] })));
  }
});
test('supported blocks use immutable story IDs and preserve all inline markup', () => {
  const result = linkedLetterBlocks(summary, document());
  assert.equal(result[1].text, blocks[1].text);
  assert.deepEqual(result[1].sources, [{ id: 'story-a', headline: 'Saab: Höjd prognos', href: '/nyhet/saab-hojd-prognos~story-a' }]);
  assert.deepEqual(result[0].sources, []);
  assert.deepEqual(result[2].sources, []);
});
test('duplicates collapse by story ID, never shared headline or event ID', () => {
  const doc = document();
  doc.sources.push({ ...doc.sources[0], id: 'story-b' });
  doc.blocks[1].sourceStoryIds = ['story-a', 'story-a', 'story-b'];
  assert.deepEqual(linkedLetterBlocks(summary, doc)[1].sources.map(s => s.href), [
    '/nyhet/saab-hojd-prognos~story-a', '/nyhet/saab-hojd-prognos~story-b',
  ]);
});
test('stale text and invalid provenance fall back to readable unlinked paragraphs', () => {
  for (const mutate of [
    doc => { doc.schemaVersion = 2; },
    doc => { doc.blocks[1].text += ' Changed.'; },
    doc => { doc.blocks[1].sourceStoryIds = ['unknown']; },
    doc => { doc.blocks[1].sourceStoryIds = ['../bad']; },
    doc => { doc.blocks[0].sourceStoryIds = ['story-a']; },
    doc => { doc.sources[0].id = 'event-common'; },
    doc => { doc.sources.push({ ...doc.sources[0] }); },
    doc => { doc.sources[0].headline = ''; },
    doc => { doc.blocks[1].text = 'Embedded\nparagraph'; },
    doc => { doc.blocks[1].text = 'Embedded ##heading##'; },
  ]) {
    const doc = document(); mutate(doc);
    assert.deepEqual(linkedLetterBlocks(summary, doc), letterBlocks(summary).map(b => ({ ...b, sources: [] })));
  }
});
