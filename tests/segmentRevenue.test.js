import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { geographicRevenueForCompany, geographicRevenueView, segmentRevenueForCompany, segmentRevenueView } from '../app/utils/segmentRevenue.js';
import { fetchCompanyOverview } from '../app/utils/api.js';
import { fictionalGeographicRevenue } from './fixtures/segment-revenue.mjs';

const reports = JSON.parse(readFileSync(new URL('../app/designsystem/segments/reviewed-reports.json', import.meta.url)));
const record = () => structuredClone(reports[0]);

test('the existing overview request preserves optional segment evidence without another API call', async t => {
  const raw = record();
  const payload = { access: { plus: true }, financials: { symbol: raw.symbol, segmentRevenue: raw, geographicRevenue: fictionalGeographicRevenue(raw.symbol) } };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls += 1;
    assert.ok(url.endsWith(`/feed/company/${raw.symbol}/overview`));
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Cookie, 'fixture-session=member');
    return Response.json(payload);
  });
  assert.deepEqual(await fetchCompanyOverview(raw.symbol, 'fixture-session=member'), payload);
  assert.equal(calls, 1);
});

test('stock-page segment data must match both the requested company and its API envelope', () => {
  const raw = record();
  assert.equal(segmentRevenueForCompany({ symbol: raw.symbol, segmentRevenue: raw }, raw.symbol), raw);
  assert.equal(segmentRevenueForCompany({ segmentRevenue: raw }, raw.symbol.toLowerCase()), raw);
  for (const financials of [{ symbol: 'WRONG.ST', segmentRevenue: raw }, { symbol: null, segmentRevenue: raw },
    { segmentRevenue: { ...raw, symbol: 'ATCO-B.ST' } }, { segmentRevenue: raw, symbol: {} }]) {
    assert.equal(segmentRevenueForCompany(financials, raw.symbol), null);
  }
  for (const symbol of [undefined, null, '', '../ATCO-A.ST', 'ATCO-B.ST', {}]) {
    assert.equal(segmentRevenueForCompany({ segmentRevenue: raw }, symbol), null);
  }
});

test('stock-page segments keep their own annual period and currency independently of other financial charts', () => {
  const raw = { ...record(), currency: 'EUR' };
  const financials = { symbol: raw.symbol, currency: 'SEK', quarterly: [{ fiscalPeriod: '2026-Q2', revenue: 99 }], segmentRevenue: raw };
  assert.equal(segmentRevenueForCompany(financials, raw.symbol), raw);
  assert.equal(segmentRevenueForCompany(financials, raw.symbol).fiscalPeriod, '2025-FY');
  assert.equal(segmentRevenueForCompany(financials, raw.symbol).currency, 'EUR');
});

test('stock-page missing or unqualified records stay absent rather than borrowing preview data', () => {
  for (const raw of [undefined, null, {}, [], { ...record(), status: 'rejected' }, { ...record(), rows: [] }]) {
    assert.equal(segmentRevenueForCompany({ segmentRevenue: raw }, 'ATCO-A.ST'), null);
  }
  assert.equal(segmentRevenueForCompany(null, 'ATCO-A.ST'), null);
});

test('three reviewed reports produce source-bound external-revenue views', () => {
  const values = [[76513, 36700, 26313, 28817], [47121, 14783, 94], [19330, 25742, 21881, 0]];
  reports.forEach((raw, index) => {
    const view = segmentRevenueView(raw);
    assert.deepEqual(view.segments.map(row => row.revenue / 1e6), values[index]);
    assert.equal(view.href, `${raw.source.url}#page=${raw.source.pdfPage}`);
    assert.equal(view.total, raw.groupRevenue);
  });
});

test('report rounding is not an invented Other allocation or normalized percentages', () => {
  const view = segmentRevenueView(reports[2]);
  assert.equal(view.difference, -1e6);
  assert.equal(view.segments.length, 4);
  assert.equal(view.segments[3].sharePct, 0);
  assert.ok(view.segments.reduce((sum, row) => sum + row.sharePct, 0) < 100);
});

test('shares are recomputed from source rows rather than trusted cached calculations', () => {
  const raw = record();
  raw.segments = [{ label: 'Fake', revenue: 1, sharePct: 100 }];
  raw.groupRevenue = 1;
  raw.reconciliation.difference = 999;
  assert.deepEqual(segmentRevenueView(raw).segments, segmentRevenueView(reports[0]).segments);
});

test('missing rows, unreconciled totals and mixed revenue bases hide the chart', () => {
  const raw = record();
  raw.rows.splice(0, 1);
  assert.equal(segmentRevenueView(raw), null);
  for (const [key, value] of [['basis', 'total_segment_sales'], ['dimension', 'geography'], ['frequency', 'quarterly'],
    ['periodEnd', '2025-06-30'], ['fiscalPeriod', '2024-FY'], ['unitMultiplier', 100], ['status', 'rejected'],
    ['currency', ''], ['verification', null]]) assert.equal(segmentRevenueView({ ...record(), [key]: value }), null);
});

test('missing segment amounts are not zero and internal eliminations are not accepted', () => {
  const raw = record();
  raw.rows[0].revenue = null;
  raw.rows[0].evidence.cellText = '–';
  assert.equal(segmentRevenueView(raw), null);
  const internal = record();
  const elimination = internal.rows.find(row => row.role === 'eliminations');
  elimination.revenue = -880e6;
  elimination.evidence.cellText = '-880';
  assert.equal(segmentRevenueView(internal), null);
});

test('display requires matching cell values and page evidence', () => {
  for (const [key, value] of [['cellText', '76,512'], ['pdfPage', 1]]) {
    const raw = record();
    raw.rows[0].evidence[key] = value;
    assert.equal(segmentRevenueView(raw), null);
  }
});

test('malformed records and unsafe or missing sources fail closed', () => {
  for (const raw of [null, {}, [], 42, 'bad', { ...record(), rows: [null, {}] }, { ...record(), source: null }]) {
    assert.equal(segmentRevenueView(raw), null);
  }
  for (const [key, value] of [['url', 'javascript:alert(1)'], ['url', 'http://example.com/a.pdf'],
    ['url', 'https://user@example.com/a.pdf'], ['pdfPage', 0], ['pdfSha256', 'bad']]) {
    const raw = record();
    raw.source[key] = value;
    assert.equal(segmentRevenueView(raw), null);
  }
});

test('country and region revenue preserve source granularity, values, total and page', () => {
  for (const symbol of ['NORD.TEST', 'GEO-REGION.TEST']) {
    const raw = fictionalGeographicRevenue(symbol), view = geographicRevenueView(raw);
    assert.equal(view.dimension, raw.dimension);
    assert.equal(view.total, 120e6);
    assert.equal(view.href, `${raw.source.url}#page=13`);
    assert.deepEqual(view.segments.map(row => row.label), raw.rows.slice(0, -1).map(row => row.label));
    assert.equal(view.segments.reduce((sum, row) => sum + row.sharePct, 0), 100);
    assert.equal(segmentRevenueView(raw), null);
  }
  assert.equal(geographicRevenueView(record()), null);
});

test('geographic revenue is independently bound to the company and annual reporting basis', () => {
  const raw = { ...fictionalGeographicRevenue('NORD.TEST'), currency: 'EUR', fiscalPeriod: '2024-FY', periodEnd: '2024-12-31' };
  const financials = { symbol: 'NORD.TEST', currency: 'SEK', geographicRevenue: raw };
  assert.equal(geographicRevenueForCompany(financials, 'nord.test'), raw);
  assert.equal(raw.fiscalPeriod, '2024-FY');
  assert.equal(raw.currency, 'EUR');
  assert.equal(geographicRevenueForCompany(financials, 'WRONG.TEST'), null);
  assert.equal(geographicRevenueForCompany({ ...financials, symbol: 'WRONG.TEST' }, 'NORD.TEST'), null);
  assert.equal(geographicRevenueForCompany({ ...financials, geographicRevenue: { ...raw, symbol: 'WRONG.TEST' } }, 'NORD.TEST'), null);
  assert.equal(geographicRevenueForCompany({ segmentRevenue: record() }, 'NORD.TEST'), null);
  assert.equal(geographicRevenueForCompany(null, 'NORD.TEST'), null);
});

test('geography requires evidence for customer location, never asset or issuer location', () => {
  const raw = fictionalGeographicRevenue('NORD.TEST');
  for (const geographicBasis of [null, 'issuer_location', 'asset_location']) {
    assert.equal(geographicRevenueView({ ...raw, geographicBasis }), null);
  }
  for (const geographicBasisEvidence of [null, {}, { text: '', pdfPage: 13 }, { text: 'Customer location', pdfPage: 14 }]) {
    assert.equal(geographicRevenueView({ ...raw, geographicBasisEvidence }), null);
  }
  for (const [key, value] of [['basis', 'total_segment_sales'], ['dimension', 'mixed'], ['frequency', 'quarterly'], ['status', 'rejected']]) {
    assert.equal(geographicRevenueView({ ...raw, [key]: value }), null);
  }
});

test('geographic rows need matching PDF cells and a reconciled group total', () => {
  for (const mutate of [raw => raw.rows.pop(), raw => raw.rows.shift(), raw => raw.rows[0].revenue = null,
    raw => raw.rows[0].revenue = -1, raw => raw.rows[0].evidence.cellText = '999',
    raw => raw.rows[0].evidence.pdfPage = 12, raw => raw.rows[0].role = 'segment',
    raw => raw.rows[1].label = raw.rows[0].label, raw => raw.source.url = 'javascript:alert(1)']) {
    const raw = fictionalGeographicRevenue('NORD.TEST');
    mutate(raw);
    assert.equal(geographicRevenueView(raw), null);
  }
});

test('geographic rounding and actual zeroes remain unnormalized, not invented allocations', () => {
  const raw = fictionalGeographicRevenue('NORD.TEST');
  raw.rows[0].revenue -= 1e6;
  raw.rows[0].evidence.cellText = '47';
  raw.rows.splice(1, 0, { label: 'Danmark', role: 'geography', revenue: 0, evidence: { cellText: '0', pdfPage: 13 } });
  const view = geographicRevenueView(raw);
  assert.equal(view.difference, -1e6);
  assert.equal(view.segments[1].sharePct, 0);
  assert.ok(view.segments.reduce((sum, row) => sum + row.sharePct, 0) < 100);
});
