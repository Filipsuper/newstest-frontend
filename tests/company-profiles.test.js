import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCompanyProfiles } from '../app/utils/api.js';

test('profile requests are bounded and preserve public payloads', async t => {
  const durations = [];
  t.mock.method(AbortSignal, 'timeout', duration => { durations.push(duration); return new AbortController().signal; });
  const payload = { items: [{ symbol: 'NORD.TEST', axes: [], coveragePct: 0 }], missing: [] };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /symbols=NORD.TEST$/);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(payload);
  });
  assert.deepEqual(await fetchCompanyProfiles(['NORD.TEST', 'NORD.TEST']), payload);
  assert.deepEqual(durations, [8000]);
});

test('missing profile data and failed transport remain distinct, including malformed responses', async t => {
  for (const [response, failed] of [[Response.json({ items: [], missing: ['NORD.TEST'] }), false], [Response.json({ error: 'failed' }, { status: 503 }), true], [Response.json({}), true]]) {
    t.mock.method(globalThis, 'fetch', async () => response);
    const result = await fetchCompanyProfiles(['NORD.TEST']);
    assert.equal(result.unavailable === true, failed);
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.missing, ['NORD.TEST']);
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  assert.deepEqual(await fetchCompanyProfiles(['NORD.TEST']), { items: [], missing: ['NORD.TEST'], unavailable: true });
});
