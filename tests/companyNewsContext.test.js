import test from 'node:test';
import assert from 'node:assert/strict';
import { storyToCompanyItem } from '../app/utils/storyToItem.js';
import { companyStoryHref, storyHref } from '../app/utils/storyUrls.js';
import { rowReaction } from '../app/utils/reactionV2.js';

const story = {
  id: 'multiple-companies', headline: 'Parent: uppdatering om dotterbolag',
  publishedAt: '2026-10-06T10:00:00Z',
  companies: [{ symbol: 'PARENT.ST', name: 'Parent' }, { symbol: 'CHILD.ST', name: 'Child' }],
  reaction: { symbol: 'PARENT.ST', pct: 12 },
};
test('company page identity and observation refer to its verified company member', () => {
  const item = storyToCompanyItem(story, 'CHILD.ST');
  assert.equal(item.symbol, 'CHILD.ST');
  assert.equal(item.company, 'Child');
  assert.equal(item.relatedCompany, 'Parent');
  assert.equal(item.readerCompany, 'CHILD.ST');
  assert.equal(rowReaction(item).pct, null, 'never reuse the parent reaction');
  assert.equal(rowReaction(storyToCompanyItem(story, 'PARENT.ST')).pct, 12);
  assert.deepEqual(item.companies, story.companies);
  assert.equal(story.companies[0].symbol, 'PARENT.ST');
});
test('unknown company does not become an inferred news or price association', () => {
  const item = storyToCompanyItem(story, 'OTHER.ST');
  assert.equal(item.symbol, 'PARENT.ST');
  assert.equal(item.readerCompany, undefined);
  assert.equal(item.relatedCompany, undefined);
});
test('reader company context is safely encoded and does not replace immutable story ID', () => {
  assert.equal(companyStoryHref(story.id, story.headline, 'CHILD.ST'), `${storyHref(story.id, story.headline)}?company=CHILD.ST`);
  assert.equal(companyStoryHref(story.id, story.headline, '../bad'), storyHref(story.id, story.headline));
  assert.equal(companyStoryHref('../bad', story.headline, 'CHILD.ST'), null);
});
