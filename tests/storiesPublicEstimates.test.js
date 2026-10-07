// Synthetic reader contracts only; this file never publishes a real article.
import test from 'node:test';
import assert from 'node:assert/strict';
import { publicEstimateArticleFixture } from './fixtures/stories-public-estimates.mjs';
import { qualifiedOmxsumStory, qualifiedOmxsumStoryDraft } from '../app/utils/omxsumStories.js';
import { fetchOmxsumStory, fetchOmxsumStories } from '../app/utils/api.js';

const publication = publicEstimateArticleFixture;
test('public v2 reader keeps the exact qualified estimates without the Studio raw/audit fields', () => {
    const article = publication(); article.estimateContext.input = 'private'; article.estimateContext.decisions = [{ raw: 'private' }];
    article.estimateContext.charts[0].rows[0].evidenceId = 'private'; article.estimateContext.charts[0].unit.provider = 'private';
    const value = qualifiedOmxsumStory(article); assert.ok(value);
    assert.equal(value.estimateContext.charts[1].rows.at(-2).values.consensus, -1e6);
    assert.equal(JSON.stringify(value.estimateContext).includes('private'), false);
});
for (const [name, mutate] of [
    ['simulated origin', a => { a.estimateContext.origin = 'simulated_test'; }], ['wrong article', a => { a.estimateContext.binding.articleId = `omxs_${'c'.repeat(24)}`; }],
    ['another revision', a => { a.estimateContext.binding.revision++; }], ['wrong financial currency', a => { a.estimateContext.charts[0].unit.currency = 'USD'; }],
    ['capture after publication', a => { a.estimateContext.capturedAt = new Date(Date.parse(a.publishedAt) + 1).toISOString(); }],
    ['wrong fiscal period', a => { a.estimateContext.charts[0].rows[0].id = '2025-Q1'; }],
    ['model plus consensus in same row', a => { a.estimateContext.charts[0].rows.at(-2).values.model = 1; }],
]) test(`public reader suppresses ${name}`, () => {
    const article = publication(); mutate(article); assert.equal(qualifiedOmxsumStory(article), null);
});
test('private Studio drafts stay unpublished and do not invoke public origin/estimate delivery', () => {
    const value = publication(); value.status = 'draft'; value.publishedAt = null; value.estimateContext.origin = 'simulated_test';
    assert.ok(qualifiedOmxsumStoryDraft(value)); assert.equal(qualifiedOmxsumStory(value), null);
});
test('actual public list/detail fetch path carries qualified context using read-only uncached requests', async t => {
    const article = publication(), calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        calls.push({ url, options });
        return Response.json(String(url).includes('/omxsum-stories?') ? { items: [article], enabled: true, nextCursor: null } : { article });
    });
    assert.equal((await fetchOmxsumStory(article.id)).estimateContext.charts.length, 3);
    assert.equal((await fetchOmxsumStories({ symbol: article.symbol })).items[0].estimateContext.charts.length, 3);
    assert.ok(calls.every(call => call.options.cache === 'no-store' && call.options.credentials === 'omit' && !call.options.method));
});
test('malformed estimate context cannot be silently replaced with a different article or revision by API fetch', async t => {
    const article = publication(); article.estimateContext.binding.revision++;
    t.mock.method(globalThis, 'fetch', async () => Response.json({ article }));
    await assert.rejects(fetchOmxsumStory(article.id), /verifieras/);
});
