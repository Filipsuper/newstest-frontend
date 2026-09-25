import test from 'node:test';
import assert from 'node:assert/strict';
import { companyProfileInsights } from '../app/utils/companyProfileInsights.js';
import { fictionalProfileInsights } from './fixtures/profile-insights.mjs';

const record = () => ({ symbol: 'NORD.TEST', insights: fictionalProfileInsights() });

test('profile insights retain reviewed report wording, category, period and page links', () => {
  const raw = record(), view = companyProfileInsights(raw, 'NORD.TEST');
  assert.equal(view.fiscalPeriod, '2025-FY');
  assert.equal(view.source.title, 'Fiktiv årsrapport');
  for (const key of ['opportunities', 'risks']) {
    assert.deepEqual(view[key].map(row => row.text), raw.insights[key].map(row => row.text));
    assert.equal(view[key][0].href, `${raw.insights.source.url}#page=${raw.insights[key][0].pdfPage}`);
  }
});

test('missing excerpts never turn scores or management outlook into invented insights', () => {
  for (const insights of [null, undefined, {}, { risks: ['Risk'], opportunities: ['Opportunity'] }]) {
    assert.equal(companyProfileInsights({ symbol: 'NORD.TEST', axes: [{ key: 'health', score: 5 }], insights }, 'NORD.TEST'), null);
  }
  assert.equal(companyProfileInsights(null, 'NORD.TEST'), null);
});

test('insight company, report basis, verification and period must match the contract', () => {
  for (const [key, value] of [['symbol', 'WRONG.TEST'], ['kind', 'score_inference'], ['status', 'pending'],
    ['verification', null], ['fiscalPeriod', 'latest']]) {
    const raw = record(); raw.insights[key] = value;
    assert.equal(companyProfileInsights(raw, 'NORD.TEST'), null);
  }
  assert.equal(companyProfileInsights({ ...record(), symbol: 'WRONG.TEST' }, 'NORD.TEST'), null);
  assert.equal(companyProfileInsights(record(), 'WRONG.TEST'), null);
});

test('unsafe source URLs and unqualified report references are not displayable', () => {
  for (const [key, value] of [['url', 'javascript:alert(1)'], ['url', 'http://example.test/a.pdf'],
    ['url', 'https://user@example.test/a.pdf'], ['title', ''], ['pdfSha256', 'bad']]) {
    const raw = record(); raw.insights.source[key] = value;
    assert.equal(companyProfileInsights(raw, 'NORD.TEST'), null);
  }
});

test('missing categories, invalid excerpts and missing pages fail closed', () => {
  for (const rows of [undefined, null, ['Unqualified'], [{ text: '', pdfPage: 1 }],
    [{ text: 'Text', pdfPage: 0 }], [{ text: 'Text' }], [{ text: 'x'.repeat(801), pdfPage: 1 }]]) {
    const raw = record(); raw.insights.risks = rows;
    assert.equal(companyProfileInsights(raw, 'NORD.TEST'), null);
  }
  const raw = record(); raw.insights.risks = [];
  const view = companyProfileInsights(raw, 'NORD.TEST');
  assert.deepEqual(view.risks, []);
  assert.equal(view.opportunities.length, 2);
});
