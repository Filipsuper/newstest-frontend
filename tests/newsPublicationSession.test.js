import test from 'node:test';
import assert from 'node:assert/strict';
import { newsPublicationSession } from '../app/utils/newsPublicationSession.js';

const story = timing => ({ id: 'news', version: 1, ts: 1000, symbol: 'OWN.ST',
  reactionV2: { schemaVersion: 2, storyId: 'news', storyVersion: 1, publishedAt: new Date(1000).toISOString(),
    measurements: [{ symbol: 'OWN.ST', timing }] } });
test('publication labels use exact story/company timing and remain historical', () => {
  assert.equal(newsPublicationSession(story('before_open')), 'beforeOpen');
  assert.equal(newsPublicationSession(story('after_close')), 'afterClose');
  for (const timing of ['during_session', 'non_trading_day', undefined]) assert.equal(newsPublicationSession(story(timing)), null);
});
test('missing or mismatched timing does not guess trading hours', () => {
  assert.equal(newsPublicationSession({ id: 'x', ts: Date.now(), symbol: 'NOVO-B' }), null);
  assert.equal(newsPublicationSession({ ...story('after_close'), version: 2 }), null);
  assert.equal(newsPublicationSession({ ...story('after_close'), symbol: 'OTHER.ST' }), null);
  assert.equal(newsPublicationSession({ ...story('after_close'), ts: 2000 }), null);
});
