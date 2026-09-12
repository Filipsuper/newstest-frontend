import test from 'node:test';
import assert from 'node:assert/strict';
import { personalMatchKinds, reconcileNewsSnapshot } from '../app/utils/personalNews.js';

const item = (id, version = 1) => ({ id, eventId: id, version, title: id, ts: 100, status: 'flash' });
test('overlapping preference reasons belong to all their filters', () => {
  assert.deepEqual(personalMatchKinds({ viaWatchlist: true, matchedTopic: 'ORDER', matchedKeyword: 'AI' }), ['companies', 'topics', 'keywords']);
  assert.deepEqual(personalMatchKinds({ viaIndustry: true }), ['topics']);
  assert.deepEqual(personalMatchKinds({}), []);
});
test('snapshot accepts new content automatically and removes absent or withdrawn rows', () => {
  assert.deepEqual(reconcileNewsSnapshot([item('old'), item('keep')], [item('keep', 2), item('new')]).map(x => x.id), ['keep', 'new']);
  assert.deepEqual(reconcileNewsSnapshot([item('old')], [{ ...item('old', 2), status: 'retracted' }]), []);
});
test('older snapshots cannot overwrite or withdraw a newer story version', () => {
  const current = item('story', 3);
  assert.equal(reconcileNewsSnapshot([current], [item('story', 2)])[0].version, 3);
  assert.equal(reconcileNewsSnapshot([current], [{ ...item('story', 2), status: 'retracted' }])[0].version, 3);
});
test('an alternate wire replaces an absent representative without dropping the event', () => {
  const previous = { ...item('primary-wire'), eventId: 'same-event', importance: 95 };
  const replacement = { ...item('alternate-wire'), eventId: 'same-event', importance: 80 };
  assert.deepEqual(reconcileNewsSnapshot([previous], [replacement]).map(row => row.id), ['alternate-wire']);
});
