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

function contextStory(timing) {
  const publishedAt = timing === 'before_open' ? 1000 : timing === 'after_close' ? 4500 : 3000;
  return { id: 'context-news', version: 1, ts: publishedAt, symbol: 'OWN.ST',
    companyContext: { schemaVersion: 1, scope: 'session_context', storyId: 'context-news', storyVersion: 1,
      publishedAt, asOf: 5000, companies: [{ symbol: 'OWN.ST', timing, asOf: 5000,
        validUntil: 6000, relationship: 'before_event_session',
        session: { date: '1970-01-01', open: 2000, close: 4000, exchange: 'XSTO', calendarVersion: 'fictional-calendar' }, fields: {} }] } };
}
test('calendar-verified company timing survives missing v2 and expired quote fields', () => {
  assert.equal(newsPublicationSession(contextStory('before_open')), 'beforeOpen');
  assert.equal(newsPublicationSession(contextStory('after_close')), 'afterClose');
  for (const timing of ['during_session', 'non_trading_day', undefined])
    assert.equal(newsPublicationSession(contextStory(timing)), null);
});
test('company-context fallback rejects wrong story, revision, publication, symbol and calendar', () => {
  for (const patch of [
    value => { value.companyContext.storyId = 'other'; },
    value => { value.companyContext.storyVersion = 2; },
    value => { value.companyContext.publishedAt = 4999; },
    value => { value.companyContext.companies[0].symbol = 'OTHER.ST'; },
    value => { delete value.companyContext.companies[0].session.calendarVersion; },
    value => { value.companyContext.companies[0].session.exchange = 'XHEL'; },
  ]) {
    const value = contextStory('after_close'); patch(value);
    assert.equal(newsPublicationSession(value), null);
  }
  const value = contextStory('after_close');
  value.reactionV2 = { schemaVersion: 2, storyId: value.id, storyVersion: 1, publishedAt: value.ts,
    measurements: [{ symbol: 'OWN.ST', timing: 'during_session' }] };
  assert.equal(newsPublicationSession(value), null); // A declared v2 timing takes precedence.
});
