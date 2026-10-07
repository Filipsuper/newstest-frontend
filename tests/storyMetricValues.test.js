import test from 'node:test';
import assert from 'node:assert/strict';
import { validStoryMetricValue, storyMetricDisplay } from '../app/utils/storyMetricValues.js';
import { qualifiedOmxsumStory, qualifiedOmxsumStoryDraft } from '../app/utils/omxsumStories.js';
import { omxsumV2Fixtures } from './fixtures/omxsum-stories.mjs';

for (const [unit, value, expected] of [
    ['percent_range', { lower: 22, upper: 26 }, '22–26 %'], ['year_range', { lower: 2027, upper: 2028 }, '2027–2028'],
    ['year', 2028, '2028'], ['date', '2026-10-05', '5 oktober 2026'], ['MWp', 700, '700 MWp'], ['trading_days', 60, '60 handelsdagar'],
]) test(`typed reader value ${unit} retains its meaning and human format`, () => {
    const metric = { unit, value, currency: null };
    assert.equal(validStoryMetricValue(metric), true);
    assert.equal(storyMetricDisplay(metric), expected);
});
for (const metric of [
    { unit: 'date', value: '2026-02-30' }, { unit: 'year', value: 2027.5 }, { unit: 'year', value: true },
    { unit: 'year_range', value: { lower: 2028, upper: 2027 } }, { unit: 'percent_range', value: { lower: 20, upper: 25, midpoint: 22.5 } },
    { unit: 'percent_range', value: { lower: 20, upper: Infinity } }, { unit: 'money', value: 99 },
    { unit: 'MWp', value: 700, currency: 'SEK' }, { unit: 'percent_range', value: 22 },
]) test(`invalid typed value ${JSON.stringify(metric)} is rejected`, () => assert.equal(validStoryMetricValue(metric), false));

test('local draft qualification never loosens the public published-only entry point', () => {
    const draft = structuredClone(omxsumV2Fixtures[0]);
    draft.status = 'draft'; draft.publishedAt = null;
    assert.equal(qualifiedOmxsumStoryDraft(draft), draft);
    assert.equal(qualifiedOmxsumStory(draft), null);
    draft.publishedAt = draft.asOf;
    assert.equal(qualifiedOmxsumStoryDraft(draft), null);
});
