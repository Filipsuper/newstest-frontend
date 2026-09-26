import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { companyBriefingPrice, prototypeBriefingPrice, qualifiedCompanyBriefing } from '../app/utils/companyBriefing.js';

const record = JSON.parse(readFileSync(new URL('../app/designsystem/company-briefing/nanexa.json', import.meta.url)));
test('reviewed prototype has dated claim-level sources and an exact company', () => {
  assert.equal(qualifiedCompanyBriefing(record, 'NANEXA.ST', { allowPrototype: true }), record);
  assert.equal(qualifiedCompanyBriefing(record, 'NANEXA.ST'), null);
  assert.equal(qualifiedCompanyBriefing(record, 'XCSE.NOVO-B'), null);
  assert.equal(qualifiedCompanyBriefing(null, 'NANEXA.ST'), null);
  assert.match(record.summary.text, /I Q2/);
  assert.match(record.summary.text, /Initialbetalningen anges inte separat/);
  assert.match(record.summary.text, /Forge Nano/);
  assert.deepEqual(record.summary.sourceIds, ['novo', 'q2', 'forge']);
  assert.equal(record.points, undefined);
  assert.equal(record.next, undefined);
});
test('missing, unsafe and orphaned evidence cannot render a briefing', () => {
  for (const mutate of [
    draft => { draft.sources = []; },
    draft => { draft.sources[0].url = 'javascript:alert(1)'; },
    draft => { draft.sources[0].publishedAt = 'unknown'; },
    draft => { draft.sources.push(draft.sources[0]); },
    draft => { draft.summary.sourceIds = ['unknown']; },
    draft => { draft.background[0].sourceIds = []; },
    draft => { draft.asOf = 'unknown'; },
    draft => { draft.headline = 123; },
    draft => { draft.sources[0] = null; },
    draft => { draft.background = {}; },
    draft => { draft.background = 'bad input'; },
    draft => { draft.background[0].title = null; },
    draft => { draft.background.push(draft.background[0]); },
    draft => { draft.summary.text = []; },
  ]) {
    const draft = structuredClone(record); mutate(draft);
    assert.equal(qualifiedCompanyBriefing(draft, 'NANEXA.ST', { allowPrototype: true }), null);
  }
});
test('real snapshot is not a runtime fallback and preview has no production override', () => {
  const page = readFileSync(new URL('../app/designsystem/company-briefing/page.jsx', import.meta.url), 'utf8');
  assert.match(page, /process\.env\.NODE_ENV !== 'development'/);
  assert.match(page, /!process\.env\.COMPANY_BRIEFING_SNAPSHOT/);
  const publicRoute = readFileSync(new URL('../app/aktie/[symbol]/page.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(publicRoute, /briefing|nanexa\.json|COMPANY_BRIEFING_SNAPSHOT/);
});
test('generated briefings need a current validity window', () => {
  const generated = { ...record, mode: 'generated', asOf: new Date().toISOString(), validUntil: new Date(Date.now() + 86400_000).toISOString() };
  assert.equal(qualifiedCompanyBriefing(generated, record.symbol), generated);
  for (const validUntil of [undefined, 'bad', new Date(Date.now() - 1).toISOString()]) {
    assert.equal(qualifiedCompanyBriefing({ ...generated, validUntil }, record.symbol), null);
  }
  assert.equal(qualifiedCompanyBriefing({ ...generated, asOf: new Date(Date.now() + 86400_000).toISOString() }, record.symbol), null);
});

const priceDraft = JSON.parse(readFileSync(new URL('../app/designsystem/company-briefing/nanexa-price.json', import.meta.url)));
test('approved news and independently composed quote stay separate', () => {
  assert.equal(qualifiedCompanyBriefing(priceDraft, 'NANEXA.ST', { allowPrototype: true }), priceDraft);
  assert.doesNotMatch(priceDraft.summary.text, /105,1/);
  assert.match(priceDraft.summary.text, /villkorade milstolpar/);
  assert.equal(prototypeBriefingPrice(priceDraft, 'NANEXA.ST').sentence,
    'Den 25 september kl. 17.15 var aktien upp 105,1 procent för dagen.');
  assert.equal(prototypeBriefingPrice(priceDraft, 'XCSE.NOVO-B'), null);
  assert.equal(prototypeBriefingPrice({ ...priceDraft, mode: 'generated' }, 'NANEXA.ST'), null);
  assert.equal(prototypeBriefingPrice(record, 'NANEXA.ST'), null);
});
test('quote composition rejects unavailable inputs and handles negative or flat days', () => {
  for (const patch of [
    { price: null }, { price: '12.16' }, { price: Infinity }, { price: 0 },
    { baselinePrice: 0 }, { baselinePrice: null }, { observedAt: 'unknown' },
    { baselineDate: '2026-09-26' }, { source: '' }, { basis: 'event_return' },
  ]) {
    assert.equal(prototypeBriefingPrice({ ...priceDraft, priceContext: { ...priceDraft.priceContext, ...patch } }, 'NANEXA.ST'), null);
  }
  const compose = price => prototypeBriefingPrice({ ...priceDraft, priceContext: {
    ...priceDraft.priceContext, baselinePrice: 10, price,
  } }, 'NANEXA.ST').sentence;
  assert.match(compose(9), /ned 10,0 procent/);
  assert.match(compose(10), /oförändrad för dagen/);
  assert.match(compose(10.001), /oförändrad för dagen/);
});

const priceInput = () => ({ symbol: 'NANEXA.ST', now: Date.parse('2026-09-26T08:00:00Z'),
  profile: { tradingCurrency: 'SEK', timezone: 'Europe/Stockholm' },
  quote: { price: 12.16, change: 6.23, changePct: 105.059, source: 'spark', quoteTime: Date.parse('2026-09-25T15:15:00Z') },
  chart: { symbol: 'NANEXA.ST', bars: [
    { date: '2026-09-25', close: 12.16 }, { date: '2026-09-23', close: 5.5 }, { date: '2026-09-24', close: 5.93 },
  ] },
});
test('cached summaries compose the same dated price context from the header quote', () => {
  const input = priceInput();
  const result = companyBriefingPrice(input);
  assert.equal(result.sentence, 'Den 25 september kl. 17.15 var aktien upp 105,1 procent för dagen.');
  assert.equal(result.baselineDate, '2026-09-24');
  assert.equal(result.currency, 'SEK');
  const cached = { ...priceDraft, mode: 'generated', validUntil: '2026-10-08T16:24:00Z' };
  const before = JSON.stringify(cached);
  assert.equal(qualifiedCompanyBriefing(cached, input.symbol, { now: input.now }), cached);
  input.quote = { ...input.quote, price: 5.337, change: -0.593, changePct: -10, quoteTime: Date.parse('2026-09-25T15:16:00Z') };
  assert.match(companyBriefingPrice(input).sentence, /17.16 var aktien ned 10,0 procent/);
  assert.equal(JSON.stringify(cached), before); // No rewrite or insertion into cached model text.
});
test('bad quote context is omitted instead of borrowing another symbol, date, currency or adjustment', () => {
  for (const mutate of [
    i => { i.chart.symbol = 'OTHER.ST'; }, i => { i.quote.symbol = 'OTHER.ST'; },
    i => { i.quote.price = null; }, i => { i.quote.price = '12.16'; },
    i => { i.quote.changePct = null; }, i => { i.quote.changePct = -3; },
    i => { i.quote.change = 99; }, i => { i.quote.source = null; },
    i => { i.quote.quoteTime = null; i.quote.receivedAt = i.now; },
    i => { i.quote.quoteTime = i.now + 600_000; }, i => { i.now += 8 * 86400_000; },
    i => { i.profile.timezone = 'invalid'; }, i => { i.profile.tradingCurrency = null; },
    i => { i.quote.currency = 'DKK'; }, i => { i.chart.bars = []; },
    i => { i.chart.bars = [{ date: '2026-09-24', close: null }]; },
    i => { i.chart.bars = [{ date: '2026-09-24', close: 2.965 }]; },
    i => { i.chart.bars = [{ date: '2026-09-01', close: 5.93 }]; },
  ]) {
    const input = priceInput(); mutate(input);
    assert.equal(companyBriefingPrice(input), null);
  }
});
test('intraday session baselines and Nordic currency/timezone stay exact', () => {
  const input = priceInput();
  input.chart.bars = [];
  input.intraday = { symbol: input.symbol, sessionDate: '2026-09-25', previousSessionDate: '2026-09-24', previousClose: 5.93 };
  assert.ok(companyBriefingPrice(input));
  input.intraday.symbol = 'OTHER.ST';
  assert.equal(companyBriefingPrice(input), null);
  input.intraday.symbol = input.symbol;
  input.intraday.sessionDate = '2026-09-24';
  assert.equal(companyBriefingPrice(input), null);
  const nordic = priceInput();
  nordic.symbol = nordic.chart.symbol = 'XHEL.SCANFL';
  nordic.profile = { tradingCurrency: 'EUR', timezone: 'Europe/Helsinki' };
  nordic.quote.source = 'yahoo-chart';
  assert.equal(companyBriefingPrice(nordic).currency, 'EUR');
  assert.match(companyBriefingPrice(nordic).sentence, /kl. 18.15/);
});
test('unknown API modes cannot bypass generated-briefing expiry checks', () => {
  for (const mode of [undefined, 'cached', 'reviewed_prototype']) {
    assert.equal(qualifiedCompanyBriefing({ ...record, mode }, record.symbol), null);
  }
});
