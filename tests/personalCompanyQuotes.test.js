import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPersonalQuoteSnapshot, mergePersonalQuoteSnapshot, personalCompanyQuote,
  personalCompanySparkGeometry, personalDailyHistory, personalIntradayHistory, personalQuotePage,
  personalQuoteSymbols, PERSONAL_QUOTE_REFRESH_MS } from '../app/utils/personalCompanyQuotes.js';

const at = value => Date.parse(value);
const now = at('2026-09-30T13:00:00Z');
const first = at('2026-09-30T07:00:00Z');
const last = at('2026-09-30T12:00:00Z');
const symbol = 'ONE.ST';
const body = { symbol, timezone: 'Europe/Stockholm', sessionDate: '2026-09-30', previousClose: 100,
  current: [{ time: first, close: 100 }, { time: last, close: 102 }],
  quote: { price: 102, changePct: 2, quoteTime: last, currency: 'SEK', sourceName: 'Testkälla' } };

test('preserve follow order and page just four exact symbols, including 100 follows', () => {
  assert.deepEqual(personalQuoteSymbols(['one.st', 'TWO.ST', 'ONE.ST', '', 'WRONG/SYMBOL']), ['ONE.ST', 'TWO.ST']);
  const follows = Array.from({ length: 100 }, (_, index) => `C${index}.ST`);
  assert.deepEqual(personalQuotePage(follows, 0).symbols, follows.slice(0, 4));
  assert.deepEqual(personalQuotePage(follows, 24).symbols, follows.slice(-4));
  assert.equal(personalQuotePage(follows, 1000).page, 24);
  assert.deepEqual(personalQuotePage([], 1).symbols, []);
});

test('quote and signed change require the exact company and a real source time', () => {
  const quote = personalCompanyQuote(body, symbol, now);
  assert.equal(quote.price, 102);
  assert.equal(quote.change, 2);
  assert.match(quote.period, /30 sep.*2026/);
  assert.equal(quote.time, '14:00');
  assert.equal(personalCompanyQuote({ ...body, symbol: 'WRONG.ST' }, symbol, now), null);
  for (const quote of [{ price: 0 }, { price: 102, quoteTime: now + 1 }, { price: 102, quoteTime: null }, { price: '102', quoteTime: last }]) {
    assert.equal(personalCompanyQuote({ ...body, quote }, symbol, now), null);
  }
  assert.equal(personalCompanyQuote({ ...body, quote: { ...body.quote, changePct: 0, price: 100 } }, symbol, now).change, 0);
  assert.equal(personalCompanyQuote({ ...body, quote: { ...body.quote, changePct: null } }, symbol, now).change, null);
  assert.equal(personalCompanyQuote({ ...body, quote: { ...body.quote, changePct: 20 } }, symbol, now).change, null);
});

test('old snapshots retain their actual date and do not borrow quote or reporting currency', () => {
  const old = personalCompanyQuote({ ...body, quote: { ...body.quote, quoteTime: first - 86_400_000 } }, symbol, now);
  assert.match(old.period, /29 sep.*2026/);
  assert.notEqual(old.period, 'Idag');
  const nordic = { ...body, symbol: 'ONE.OL', quote: { ...body.quote, currency: null, source: 'yahoo-chart-snapshot', sourceName: null }, updateMode: 'snapshot' };
  assert.equal(personalCompanyQuote(nordic, 'ONE.OL', now).currency, null);
  assert.equal(personalCompanyQuote(nordic, 'ONE.OL', now).source, 'Yahoo Finance');
  assert.equal(personalCompanyQuote(nordic, 'ONE.OL', now).delayed, true);
  assert.equal(personalCompanyQuote({ ...body, quote: { ...body.quote, currency: null } }, symbol, now).currency, null);
});

test('session curves contain only observed prices on one explicit trading date', () => {
  assert.deepEqual(personalIntradayHistory(body, symbol, now).points, [[first, 100], [last, 102]]);
  assert.match(personalIntradayHistory(body, symbol, now).period, /Handelsdagen 30 sep.*2026/);
  assert.equal(personalIntradayHistory({ ...body, symbol: 'WRONG.ST' }, symbol, now), null);
  assert.equal(personalIntradayHistory({ ...body, sessionDate: '2026-09-29' }, symbol, now), null);
  assert.equal(personalIntradayHistory({ ...body, current: [{ time: first - 86_400_000, close: 99 }, ...body.current] }, symbol, now), null);
  const dirty = { ...body, current: [...body.current, { time: last, close: 102 }, { time: first, close: 90 }, { time: now + 1, close: 200 }, { time: last - 1, close: 0 }] };
  assert.deepEqual(personalIntradayHistory(dirty, symbol, now).points, [[last, 102]]);
  assert.deepEqual(personalCompanySparkGeometry([[last, 102]]).dot, { x: 36, y: 12 });
  assert.match(personalCompanySparkGeometry([[first, 100], [last, 100]]).path, /^M2.00,12.00 L70.00,12.00$/);
});

test('daily fallback preserves actual dates and never turns its range into a daily percentage', () => {
  const daily = personalDailyHistory({ symbol, points: [[first - 86_400_000, 98], [last, 102]] }, symbol, now);
  assert.equal(daily.kind, 'daily');
  assert.match(daily.period, /Dagskurser 29 sep.*30 sep/);
  assert.equal(daily.change, undefined);
  assert.equal(personalDailyHistory({ symbol: 'WRONG.ST', points: [[first, 100]] }, symbol, now), null);
});

test('successful minute history needs one request and the cache expires', async () => {
  const calls = [];
  let time = now;
  const fetcher = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => body }; };
  const options = { fetcher, apiUrl: 'https://test-quote-cache.test', now: () => time };
  const snapshot = await fetchPersonalQuoteSnapshot(symbol, options);
  assert.equal(snapshot.quoteStatus, 'available');
  assert.equal(snapshot.historyStatus, 'available');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /company\/ONE.ST\/intraday$/);
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  await fetchPersonalQuoteSnapshot(symbol, options);
  assert.equal(calls.length, 1);
  time += PERSONAL_QUOTE_REFRESH_MS;
  await fetchPersonalQuoteSnapshot(symbol, options);
  assert.equal(calls.length, 2);
  await fetchPersonalQuoteSnapshot(symbol, { ...options, force: true });
  assert.equal(calls.length, 3);
});

test('paging through many follows cannot grow the cache beyond its bounded source slots', async () => {
  let calls = 0;
  const options = { apiUrl: 'https://test-bounded-cache.test', now: () => now,
    fetcher: async url => {
      calls++;
      const requested = decodeURIComponent(url.split('/').at(-2));
      return { ok: true, json: async () => ({ ...body, symbol: requested }) };
    } };
  for (let index = 0; index < 25; index++) await fetchPersonalQuoteSnapshot(`C${index}.ST`, options);
  assert.equal(calls, 25);
  await fetchPersonalQuoteSnapshot('C24.ST', options);
  assert.equal(calls, 25);
  await fetchPersonalQuoteSnapshot('C0.ST', options);
  assert.equal(calls, 26);
});

test('missing history delivers the real quote before a separate dated fallback', async () => {
  const calls = [], partial = [];
  const fetcher = async url => {
    calls.push(url);
    return { ok: true, json: async () => url.endsWith('/intraday') ? { ...body, current: [] }
      : { symbol, points: [[first - 86_400_000, 98], [last - 86_400_000, 100]] } };
  };
  const snapshot = await fetchPersonalQuoteSnapshot(symbol, { fetcher, apiUrl: 'https://test-daily-fallback.test', now: () => now, onPartial: row => partial.push(row) });
  assert.equal(calls.length, 2);
  assert.equal(partial[0].quote.price, 102);
  assert.equal(partial[0].historyStatus, 'loading');
  assert.equal(snapshot.quote.price, 102);
  assert.equal(snapshot.history.kind, 'daily');
  assert.equal(snapshot.quote.change, 2);
});

test('quote failures do not prevent actual fallback history and wrong-company data never displays', async () => {
  const partial = [];
  const snapshot = await fetchPersonalQuoteSnapshot(symbol, { apiUrl: 'https://test-independent.test', now: () => now,
    onPartial: row => partial.push(row), fetcher: async url => ({ ok: true, json: async () => url.endsWith('/intraday')
      ? { ...body, symbol: 'WRONG.ST' } : { symbol, points: [[first, 100], [last, 102]] } }) });
  assert.equal(snapshot.quoteStatus, 'unavailable');
  assert.equal(snapshot.quote, null);
  assert.equal(snapshot.historyStatus, 'available');
  assert.equal(partial[0].quote, null);
  const bad = await fetchPersonalQuoteSnapshot(symbol, { apiUrl: 'https://test-mismatch.test', now: () => now,
    fetcher: async () => ({ ok: true, json: async () => ({ ...body, symbol: 'WRONG.ST' }) }) });
  assert.equal(bad.quote, null);
  assert.equal(bad.history, null);
  assert.equal(bad.historyStatus, 'unavailable');
});

test('aborted account/page request cannot publish a late quote or start the fallback', async () => {
  const controller = new AbortController();
  let calls = 0, release;
  const partial = [];
  const promise = fetchPersonalQuoteSnapshot(symbol, { signal: controller.signal, apiUrl: 'https://test-abort.test', now: () => now,
    onPartial: row => partial.push(row), fetcher: async () => { calls++; await new Promise(resolve => { release = resolve; }); return { ok: true, json: async () => body }; } });
  controller.abort();
  release();
  await assert.rejects(promise, error => error.name === 'AbortError');
  assert.equal(calls, 1);
  assert.deepEqual(partial, []);
});

test('failed refresh retains dated observations explicitly; a successful absence clears them', () => {
  const previous = { quote: personalCompanyQuote(body, symbol, now), history: personalIntradayHistory(body, symbol, now) };
  const failed = mergePersonalQuoteSnapshot(previous, { symbol, quote: null, history: null, quoteStatus: 'unavailable', historyStatus: 'unavailable' });
  assert.equal(failed.quote.observedAt, last);
  assert.equal(failed.quoteRetained, true);
  assert.equal(failed.historyRetained, true);
  const absent = mergePersonalQuoteSnapshot(previous, { symbol, quote: null, history: null, quoteStatus: 'missing', historyStatus: 'missing' });
  assert.equal(absent.quote, null);
  assert.equal(absent.history, null);
});
