import test from 'node:test';
import assert from 'node:assert/strict';
import { omxsumStoryFixtures, omxsumV2Fixtures } from './fixtures/omxsum-stories.mjs';
import { omxsumStoryId, omxsumStoryHref, omxsumStoriesHref, qualifiedOmxsumStory } from '../app/utils/omxsumStories.js';

test('editorial URLs are distinct from feed event and newsletter URLs, preserving stable identity', () => {
    const article = omxsumStoryFixtures[0], href = omxsumStoryHref(article);
    assert.match(href, /^\/story\/norden-industri/);
    assert.equal(omxsumStoryId(href.split('/').at(-1)), article.id);
    assert.equal(omxsumStoryId(article.id), article.id);
    assert.equal(omxsumStoryId('bad~' + article.id + '~extra'), null);
    assert.equal(omxsumStoryId('fixture-0'), null);
});
test('listing URL preserves stock and format without arbitrary redirects or prototype keys', () => {
    assert.equal(omxsumStoriesHref({ symbol: 'NORD.TEST', format: 'report' }), '/marknaden/stories?symbol=NORD.TEST&format=report');
    assert.equal(omxsumStoriesHref({ symbol: '//evil', format: 'toString', cursor: 'url?bad' }), '/marknaden/stories');
});
test('all three fully sourced published formats qualify', () => {
    for (const article of omxsumStoryFixtures) assert.equal(qualifiedOmxsumStory(article), article);
});
for (const [name, mutate] of [
    ['unpublished', a => { a.status = 'draft'; }], ['orphaned source', a => { a.intro.sourceIds = ['missing']; }],
    ['incidental company', a => { a.companies[0].role = 'mention'; }], ['unsafe source', a => { a.sources[0].url = 'javascript:alert(1)'; }],
    ['nonfinite data', a => { a.metrics[0].value = Infinity; }], ['unknown format', a => { a.format = 'toString'; }],
    ['empty section', a => { a.sections[0].paragraphs = []; }], ['unrelated timeline', a => { a.timeline[0].storyId = 'other'; }],
    ['future publication', a => { a.publishedAt = '2099-01-01'; }],
    ['null company', a => { a.companies[0] = null; }], ['null source', a => { a.sources[0] = null; }],
    ['null section', a => { a.sections[0] = null; }], ['null metric', a => { a.metrics[0] = null; }],
    ['null timeline', a => { a.timeline[0] = null; }],
]) test(`reader rejects ${name}`, () => { const article = structuredClone(omxsumStoryFixtures[0]); mutate(article); assert.equal(qualifiedOmxsumStory(article), null); });

test('v2 narrative accepts optional headings and metric-bound bar and line charts', () => {
    assert.equal(qualifiedOmxsumStory(omxsumV2Fixtures[0]), omxsumV2Fixtures[0]);
});
for (const [name, mutate] of [
    ['invented chart value', a => { a.charts[0].points[0].value = 999; }],
    ['orphaned chart metric', a => { a.charts[0].points[0].metricKey = 'missing'; }],
    ['currency mismatch', a => { a.charts[0].currency = 'EUR'; }],
    ['different measures mixed in history', a => { a.metrics[3].measure = 'netIncome'; }],
    ['options as firm value', a => { a.charts[0].basis = 'scale'; a.metrics[0].role = 'conditional_maximum'; }],
    ['duplicate history period', a => { a.metrics[3].period.end = a.metrics[2].period.end; }],
    ['two point line', a => { a.charts[1].points.pop(); }],
    ['future history', a => { a.metrics[4].period.end = '2099-12-31'; }],
    ['provider leaked publicly', a => { a.sources[1].publisher = 'Yahoo'; }],
]) test(`v2 rejects ${name}`, () => { const article = structuredClone(omxsumV2Fixtures[0]); mutate(article); assert.equal(qualifiedOmxsumStory(article), null); });
