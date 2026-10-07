import test from 'node:test';
import assert from 'node:assert/strict';
import { readScreenerCompany, screenerCompanyQuery, matchingCompanyOverview, cacheCompanyPreview, COMPANY_PREVIEW_TTL } from '../app/utils/screenerCompany.js';
import { screenerMetricText } from '../app/utils/screener.js';

const overview = symbol => ({ symbol, summary: { symbol, profile: { symbol, name: 'Testbolag' } }, chart: { symbol } });
test('company preview URLs retain filters, sort, columns and attribution', () => {
  const search = 'sort=pe&dir=asc&columns=price,pe&rules=test&utm_source=screen';
  const opened = screenerCompanyQuery(search, 'VOLV-B.ST');
  assert.equal(readScreenerCompany(opened), 'VOLV-B.ST');
  assert.deepEqual([...new URLSearchParams(screenerCompanyQuery(opened, null))], [...new URLSearchParams(search)]);
  for (const input of ['', 'company=%2Faktie', 'company=%3Cscript%3E', `company=${'A'.repeat(65)}`]) assert.equal(readScreenerCompany(input), null);
  assert.equal(new URLSearchParams(screenerCompanyQuery(opened, '../bad')).has('company'), false);
});
test('preview cache rejects wrong company data and is bounded to twelve company responses', () => {
  const cache = new Map();
  assert.equal(matchingCompanyOverview({}, 'NORD.TEST'), false);
  assert.equal(matchingCompanyOverview({ ...overview('NORD.TEST'), chart: { symbol: 'OTHER.TEST' } }, 'NORD.TEST'), false);
  assert.equal(cacheCompanyPreview(cache, 'NORD.TEST', overview('OTHER.TEST')), false);
  assert.equal(cache.size, 0);
  for (let index = 0; index < 13; index++) cacheCompanyPreview(cache, `C${index}`, overview(`C${index}`), 1000);
  assert.equal(cache.size, 12);
  assert.equal(cache.has('C0'), false);
  assert.equal(cache.get('C1').at, 1000);
  assert.equal(COMPANY_PREVIEW_TTL, 30_000);
  cacheCompanyPreview(cache, 'C1', overview('C1'), 2000);
  cacheCompanyPreview(cache, 'C13', overview('C13'), 3000);
  assert.equal(cache.has('C1'), true);
  assert.equal(cache.has('C2'), false);
});
test('drawer metrics use table formatting, preserving zero, loss, units and missing values', () => {
  assert.equal(screenerMetricText({ fundamentals: { ebitMarginPct: 0 } }, 'ebitMarginPct'), '0%');
  assert.equal(screenerMetricText({ fundamentals: { ebitMarginPct: -3 } }, 'ebitMarginPct'), '−3%');
  assert.equal(screenerMetricText({ fundamentals: { pe: 12 } }, 'pe'), '12x');
  assert.equal(screenerMetricText({ profile: { axes: [{ key: 'health', score: 0 }] } }, 'profile_health'), '0 av 5');
  assert.equal(screenerMetricText({}, 'pe'), 'Saknas');
  assert.equal(screenerMetricText({}, 'not-a-metric'), 'Saknas');
});
